/**
 * library-manager.ts — 라이브러리 검색 및 설치
 *
 * Arduino IDE와 유사한 라이브러리 매니저를 제공합니다.
 * 전체 목록을 로딩한 뒤 실시간 필터링으로 원하는 라이브러리를 찾을 수 있습니다.
 */
import * as vscode from 'vscode';
import { runCli, runCliJson } from './arduino-cli';

/** 라이브러리 검색 결과 항목 */
interface LibraryInfo {
    name: string;
    latest: {
        version: string;
        author: string;
        sentence: string;
        paragraph: string;
    };
}

/** 라이브러리 검색 응답 */
interface LibrarySearchResult {
    libraries: LibraryInfo[];
}

/** 설치된 라이브러리 항목 */
interface InstalledLibrary {
    library: {
        name: string;
        version: string;
    };
}

/** 설치된 라이브러리 목록 응답 */
interface InstalledLibrariesResult {
    installed_libraries: InstalledLibrary[];
}

/** 필터 모드 */
type FilterMode = 'all' | 'installed';

/**
 * 라이브러리 QuickPick 항목을 생성합니다.
 * @param lib 라이브러리 정보
 * @param installedNames 설치된 라이브러리 이름 Set
 * @returns QuickPickItem
 */
function createLibraryItem(
    lib: LibraryInfo,
    installedNames: Set<string>
): vscode.QuickPickItem {
    const isInstalled = installedNames.has(lib.name);
    const icon = isInstalled ? '$(check)' : '$(package)';
    const statusLabel = isInstalled ? ' [설치됨]' : '';
    return {
        label: `${icon} ${lib.name}${statusLabel}`,
        description: `v${lib.latest.version}`,
        detail: `${lib.latest.sentence || '설명 없음'} | 작성자: ${lib.latest.author || '알 수 없음'}`,
    };
}

/**
 * 라이브러리를 검색하고 설치하는 통합 워크플로우를 실행합니다.
 *
 * Arduino IDE처럼 전체 라이브러리 목록을 로딩하고
 * 실시간 필터링으로 원하는 라이브러리를 찾아 설치할 수 있습니다.
 */
export async function installLibrary(): Promise<void> {
    const quickPick = vscode.window.createQuickPick();
    quickPick.placeholder = '라이브러리 이름을 입력하여 필터링...';
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;
    quickPick.busy = true;
    quickPick.show();

    /** 전체 라이브러리 목록 캐시 */
    let allLibraries: LibraryInfo[] = [];
    /** 설치된 라이브러리 이름 Set */
    let installedNames = new Set<string>();
    /** 현재 필터 모드 */
    let currentFilter: FilterMode = 'all';

    /** 필터 버튼 정의 */
    const btnAll: vscode.QuickInputButton = {
        iconPath: new vscode.ThemeIcon('library'),
        tooltip: '전체 라이브러리 보기',
    };
    const btnInstalled: vscode.QuickInputButton = {
        iconPath: new vscode.ThemeIcon('check-all'),
        tooltip: '설치된 라이브러리만 보기',
    };
    quickPick.buttons = [btnInstalled];

    /**
     * 현재 필터 모드에 따라 QuickPick 항목을 갱신합니다.
     */
    function applyFilter(): void {
        const sourceLibs =
            currentFilter === 'installed'
                ? allLibraries.filter((lib) => installedNames.has(lib.name))
                : allLibraries;

        quickPick.items = sourceLibs.map((lib) =>
            createLibraryItem(lib, installedNames)
        );

        quickPick.placeholder =
            currentFilter === 'installed'
                ? `설치된 라이브러리 필터링... (${installedNames.size}개)`
                : `라이브러리 이름을 입력하여 필터링... (총 ${allLibraries.length}개)`;
    }

    // 필터 버튼 토글 이벤트
    quickPick.onDidTriggerButton((button) => {
        if (button === btnInstalled) {
            currentFilter = 'installed';
            quickPick.buttons = [btnAll];
            applyFilter();
        } else if (button === btnAll) {
            currentFilter = 'all';
            quickPick.buttons = [btnInstalled];
            applyFilter();
        }
    });

    try {
        // 전체 라이브러리 목록 + 설치된 라이브러리 병렬 로딩
        const [searchResult, installedResult] = await Promise.all([
            runCliJson<LibrarySearchResult>(['lib', 'search']),
            runCliJson<InstalledLibrariesResult>(['lib', 'list']),
        ]);

        allLibraries = searchResult.data.libraries ?? [];
        const installedLibs = installedResult.data.installed_libraries ?? [];
        installedNames = new Set(
            installedLibs.map((item) => item.library.name)
        );

        quickPick.busy = false;
        applyFilter();
    } catch (error) {
        quickPick.hide();
        quickPick.dispose();
        const message =
            error instanceof Error ? error.message : '알 수 없는 오류';
        vscode.window.showErrorMessage(
            `라이브러리 목록 로딩 실패: ${message}`
        );
        return;
    }

    // 라이브러리 선택 이벤트
    quickPick.onDidAccept(async () => {
        const selected = quickPick.selectedItems[0];
        if (!selected) {
            return;
        }

        // 라이브러리 이름 추출 (아이콘, [설치됨] 태그 제거)
        const libName = selected.label
            .replace(/^\$\([^)]+\)\s*/, '')
            .replace(/\s*\[설치됨\]$/, '');

        quickPick.hide();
        quickPick.dispose();

        // 이미 설치된 경우 안내
        if (installedNames.has(libName)) {
            const action = await vscode.window.showInformationMessage(
                `"${libName}" 라이브러리는 이미 설치되어 있습니다.`,
                '재설치 (업데이트)',
                '취소'
            );
            if (action !== '재설치 (업데이트)') {
                return;
            }
        } else {
            // 설치 확인
            const confirm = await vscode.window.showInformationMessage(
                `"${libName}" 라이브러리를 설치하시겠습니까?`,
                '설치',
                '취소'
            );
            if (confirm !== '설치') {
                return;
            }
        }

        // 설치 실행
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `"${libName}" 라이브러리 설치 중...`,
                cancellable: false,
            },
            async () => {
                try {
                    const installResult = await runCli([
                        'lib',
                        'install',
                        libName,
                    ]);

                    if (installResult.exitCode === 0) {
                        vscode.window.showInformationMessage(
                            `✅ "${libName}" 라이브러리 설치 완료!`
                        );

                        // 현재 열린 .ino 파일에 #include 추가 제안
                        const activeEditor = vscode.window.activeTextEditor;
                        if (
                            activeEditor?.document.fileName.endsWith('.ino')
                        ) {
                            const addInclude =
                                await vscode.window.showInformationMessage(
                                    `#include <${libName}.h>를 스케치에 추가하시겠습니까?`,
                                    '추가',
                                    '건너뛰기'
                                );

                            if (addInclude === '추가') {
                                const edit = new vscode.WorkspaceEdit();
                                const doc = activeEditor.document;
                                edit.insert(
                                    doc.uri,
                                    new vscode.Position(0, 0),
                                    `#include <${libName}.h>\n`
                                );
                                await vscode.workspace.applyEdit(edit);
                            }
                        }
                    } else {
                        vscode.window.showErrorMessage(
                            `라이브러리 설치 실패: ${installResult.stderr}`
                        );
                    }
                } catch (error) {
                    const message =
                        error instanceof Error
                            ? error.message
                            : '알 수 없는 오류';
                    vscode.window.showErrorMessage(
                        `라이브러리 설치 실패: ${message}`
                    );
                }
            }
        );
    });

    // 취소 시 정리
    quickPick.onDidHide(() => {
        quickPick.dispose();
    });
}

/**
 * 코어(보드 플랫폼)를 검색하고 설치합니다.
 */
export async function installCore(): Promise<void> {
    const query = await vscode.window.showInputBox({
        prompt: '설치할 코어를 검색하세요',
        placeHolder: '예: arduino, esp32, esp8266, rp2040',
    });

    if (!query) {
        return;
    }

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `"${query}" 코어 검색 중...`,
            cancellable: false,
        },
        async () => {
            try {
                // 코어 인덱스 업데이트
                await runCli(['core', 'update-index']);

                const result = await runCliJson<{
                    platforms: Array<{
                        id: string;
                        latest: string;
                        name: string;
                        installed: string;
                    }>;
                }>(['core', 'search', query]);

                const platforms = result.data.platforms ?? [];
                if (platforms.length === 0) {
                    vscode.window.showWarningMessage(
                        `"${query}"에 해당하는 코어를 찾을 수 없습니다.`
                    );
                    return;
                }

                const items: vscode.QuickPickItem[] = platforms.map((p) => ({
                    label: `$(package) ${p.name}`,
                    description: p.id,
                    detail: p.installed
                        ? `설치됨: v${p.installed} | 최신: v${p.latest}`
                        : `최신: v${p.latest}`,
                }));

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: '설치할 코어를 선택하세요',
                });

                if (!selected?.description) {
                    return;
                }

                const installResult = await runCli([
                    'core',
                    'install',
                    selected.description,
                ]);

                if (installResult.exitCode === 0) {
                    vscode.window.showInformationMessage(
                        `✅ "${selected.description}" 코어 설치 완료!`
                    );
                } else {
                    vscode.window.showErrorMessage(
                        `코어 설치 실패: ${installResult.stderr}`
                    );
                }
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : '알 수 없는 오류';
                vscode.window.showErrorMessage(`코어 검색 실패: ${message}`);
            }
        }
    );
}
