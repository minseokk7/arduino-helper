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
    const statusLabel = isInstalled ? vscode.l10n.t(' [Installed]') : '';
    return {
        label: `${icon} ${lib.name}${statusLabel}`,
        description: `v${lib.latest.version}`,
        detail: `${lib.latest.sentence || vscode.l10n.t('No description')} | ${vscode.l10n.t('Author: {0}', lib.latest.author || '?')}`,
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
    quickPick.placeholder = vscode.l10n.t('Filter by library name...');
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
        tooltip: vscode.l10n.t('View all libraries'),
    };
    const btnInstalled: vscode.QuickInputButton = {
        iconPath: new vscode.ThemeIcon('check-all'),
        tooltip: vscode.l10n.t('View installed libraries only'),
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
                ? vscode.l10n.t('Filter installed libraries... ({0})', installedNames.size)
                : vscode.l10n.t('Filter by library name... (total {0})', allLibraries.length);
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
            error instanceof Error ? error.message : vscode.l10n.t('Unknown error');
        vscode.window.showErrorMessage(
            vscode.l10n.t('Failed to load library list: {0}', message)
        );
        return;
    }

    // [설치됨] 태그의 번역된 값을 미리 저장
    const installedTag = vscode.l10n.t(' [Installed]');

    // 라이브러리 선택 이벤트
    quickPick.onDidAccept(async () => {
        const selected = quickPick.selectedItems[0];
        if (!selected) {
            return;
        }

        // 라이브러리 이름 추출 (아이콘, [설치됨] 태그 제거)
        const libName = selected.label
            .replace(/^\$\([^)]+\)\s*/, '')
            .replace(new RegExp(`\\s*${escapeRegExp(installedTag)}$`), '');

        quickPick.hide();
        quickPick.dispose();

        // 이미 설치된 경우 안내
        if (installedNames.has(libName)) {
            const action = await vscode.window.showInformationMessage(
                vscode.l10n.t('Library "{0}" is already installed.', libName),
                vscode.l10n.t('Reinstall (Update)'),
                vscode.l10n.t('Cancel')
            );
            if (action !== vscode.l10n.t('Reinstall (Update)')) {
                return;
            }
        } else {
            // 설치 확인
            const confirm = await vscode.window.showInformationMessage(
                vscode.l10n.t('Install library "{0}"?', libName),
                vscode.l10n.t('Install'),
                vscode.l10n.t('Cancel')
            );
            if (confirm !== vscode.l10n.t('Install')) {
                return;
            }
        }

        // 설치 실행
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: vscode.l10n.t('Installing library "{0}"...', libName),
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
                            `✅ ${vscode.l10n.t('Library "{0}" installed!', libName)}`
                        );

                        // 현재 열린 .ino 파일에 #include 추가 제안
                        const activeEditor = vscode.window.activeTextEditor;
                        if (
                            activeEditor?.document.fileName.endsWith('.ino')
                        ) {
                            const addInclude =
                                await vscode.window.showInformationMessage(
                                    vscode.l10n.t('Add #include <{0}.h> to sketch?', libName),
                                    vscode.l10n.t('Add'),
                                    vscode.l10n.t('Skip')
                                );

                            if (addInclude === vscode.l10n.t('Add')) {
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
                            vscode.l10n.t('Library installation failed: {0}', installResult.stderr)
                        );
                    }
                } catch (error) {
                    const message =
                        error instanceof Error
                            ? error.message
                            : vscode.l10n.t('Unknown error');
                    vscode.window.showErrorMessage(
                        vscode.l10n.t('Library installation failed: {0}', message)
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
        prompt: vscode.l10n.t('Search for a core to install'),
        placeHolder: vscode.l10n.t('e.g.: arduino, esp32, esp8266, rp2040'),
    });

    if (!query) {
        return;
    }

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: vscode.l10n.t('Searching for core "{0}"...', query),
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
                        vscode.l10n.t('No core found for "{0}".', query)
                    );
                    return;
                }

                const items: vscode.QuickPickItem[] = platforms.map((p) => ({
                    label: `$(package) ${p.name}`,
                    description: p.id,
                    detail: p.installed
                        ? vscode.l10n.t('Installed: v{0} | Latest: v{1}', p.installed, p.latest)
                        : vscode.l10n.t('Latest: v{0}', p.latest),
                }));

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: vscode.l10n.t('Select a core to install'),
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
                        `✅ ${vscode.l10n.t('Core "{0}" installed!', selected.description)}`
                    );
                } else {
                    vscode.window.showErrorMessage(
                        vscode.l10n.t('Core installation failed: {0}', installResult.stderr)
                    );
                }
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : vscode.l10n.t('Unknown error');
                vscode.window.showErrorMessage(vscode.l10n.t('Core search failed: {0}', message));
            }
        }
    );
}

/**
 * 정규식 특수문자를 이스케이프합니다.
 * @param str 이스케이프할 문자열
 * @returns 이스케이프된 문자열
 */
function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
