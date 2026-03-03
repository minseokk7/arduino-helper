/**
 * board-manager.ts — 보드 감지 및 선택 UI
 *
 * USB 연결된 보드를 자동 감지하고 QuickPick으로 보드/포트를 선택합니다.
 */
import * as vscode from 'vscode';
import { runCliJson } from './arduino-cli';
import { updateState, getState } from './config';

/** arduino-cli board list 의 JSON 응답 항목 */
interface DetectedPort {
    port: {
        address: string;
        label: string;
        protocol: string;
        protocol_label: string;
    };
    matching_boards?: Array<{
        name: string;
        fqbn: string;
    }>;
}

/** arduino-cli board listall 의 JSON 응답 항목 */
interface BoardListAllItem {
    name: string;
    fqbn: string;
    platform: {
        id: string;
        installed: string;
        name: string;
    };
}

/**
 * 현재 USB로 연결된 보드/포트 목록을 가져옵니다.
 * @returns 감지된 포트 목록
 */
export async function getConnectedBoards(): Promise<DetectedPort[]> {
    try {
        const result = await runCliJson<{ detected_ports: DetectedPort[] }>([
            'board',
            'list',
        ]);
        return result.data.detected_ports ?? [];
    } catch (error) {
        const message =
            error instanceof Error ? error.message : '알 수 없는 오류';
        vscode.window.showErrorMessage(`보드 목록 가져오기 실패: ${message}`);
        return [];
    }
}

/**
 * 설치된 모든 보드 목록을 가져옵니다.
 * @returns 전체 보드 목록
 */
export async function getAllBoards(): Promise<BoardListAllItem[]> {
    try {
        const result = await runCliJson<{ boards: BoardListAllItem[] }>([
            'board',
            'listall',
        ]);
        return result.data.boards ?? [];
    } catch (error) {
        const message =
            error instanceof Error ? error.message : '알 수 없는 오류';
        vscode.window.showErrorMessage(`보드 전체 목록 가져오기 실패: ${message}`);
        return [];
    }
}

/**
 * QuickPick으로 보드를 선택합니다.
 * 연결된 보드가 있으면 상단에 표시합니다.
 */
export async function selectBoard(): Promise<void> {
    const quickPick = vscode.window.createQuickPick();
    quickPick.placeholder = '보드를 선택하세요 (검색 가능)';
    quickPick.busy = true;
    quickPick.show();

    try {
        // 연결된 보드 + 전체 보드 목록을 함께 로드
        const [connectedPorts, allBoards] = await Promise.all([
            getConnectedBoards(),
            getAllBoards(),
        ]);

        const items: vscode.QuickPickItem[] = [];

        // 연결된 보드 우선 표시
        const connectedBoards = connectedPorts.filter(
            (p) => p.matching_boards && p.matching_boards.length > 0
        );

        if (connectedBoards.length > 0) {
            items.push({
                label: '$(plug) 연결된 보드',
                kind: vscode.QuickPickItemKind.Separator,
            });
            for (const port of connectedBoards) {
                for (const board of port.matching_boards!) {
                    items.push({
                        label: `$(circuit-board) ${board.name}`,
                        description: board.fqbn,
                        detail: `포트: ${port.port.address}`,
                    });
                }
            }
        }

        // 전체 보드 목록
        if (allBoards.length > 0) {
            items.push({
                label: '$(list-unordered) 모든 보드',
                kind: vscode.QuickPickItemKind.Separator,
            });
            for (const board of allBoards) {
                items.push({
                    label: `$(circuit-board) ${board.name}`,
                    description: board.fqbn,
                    detail: `플랫폼: ${board.platform.name}`,
                });
            }
        }

        quickPick.busy = false;
        quickPick.items = items;

        quickPick.onDidAccept(() => {
            const selected = quickPick.selectedItems[0];
            if (selected?.description) {
                updateState({
                    selectedFqbn: selected.description,
                    selectedBoardName: selected.label.replace('$(circuit-board) ', ''),
                });
                vscode.window.showInformationMessage(
                    `보드 선택됨: ${selected.label.replace('$(circuit-board) ', '')} (${selected.description})`
                );
            }
            quickPick.dispose();
        });

        quickPick.onDidHide(() => quickPick.dispose());
    } catch (error) {
        quickPick.dispose();
        const message =
            error instanceof Error ? error.message : '알 수 없는 오류';
        vscode.window.showErrorMessage(`보드 선택 실패: ${message}`);
    }
}

/**
 * QuickPick으로 포트를 선택합니다.
 */
export async function selectPort(): Promise<void> {
    const quickPick = vscode.window.createQuickPick();
    quickPick.placeholder = '포트를 선택하세요';
    quickPick.busy = true;
    quickPick.show();

    try {
        const connectedPorts = await getConnectedBoards();

        const items: vscode.QuickPickItem[] = connectedPorts.map((port) => {
            const boardName =
                port.matching_boards?.[0]?.name ?? '알 수 없는 보드';
            return {
                label: `$(plug) ${port.port.address}`,
                description: port.port.label,
                detail: `보드: ${boardName} | 프로토콜: ${port.port.protocol_label}`,
            };
        });

        if (items.length === 0) {
            quickPick.dispose();
            vscode.window.showWarningMessage(
                '연결된 보드가 없습니다. USB 케이블을 확인하세요.'
            );
            return;
        }

        quickPick.busy = false;
        quickPick.items = items;

        quickPick.onDidAccept(() => {
            const selected = quickPick.selectedItems[0];
            if (selected) {
                const portAddress = selected.label.replace('$(plug) ', '');
                updateState({ selectedPort: portAddress });
                vscode.window.showInformationMessage(
                    `포트 선택됨: ${portAddress}`
                );
            }
            quickPick.dispose();
        });

        quickPick.onDidHide(() => quickPick.dispose());
    } catch (error) {
        quickPick.dispose();
        const message =
            error instanceof Error ? error.message : '알 수 없는 오류';
        vscode.window.showErrorMessage(`포트 선택 실패: ${message}`);
    }
}

/**
 * QuickPick으로 보드와 포트를 순차적으로 선택합니다.
 */
export async function selectBoardAndPort(): Promise<void> {
    const quickPick = vscode.window.createQuickPick();
    quickPick.placeholder = '변경할 항목을 선택하거나 보드/포트를 설정하세요';
    quickPick.items = [
        { label: '$(circuit-board) 보드 선택', description: 'Arduino 보드 종류를 선택합니다.' },
        { label: '$(plug) 포트 선택', description: '연결된 USB 포트를 선택합니다.' }
    ];

    quickPick.show();

    quickPick.onDidAccept(async () => {
        const selected = quickPick.selectedItems[0];
        quickPick.dispose();

        if (selected.label.includes('보드')) {
            await selectBoard();
        } else if (selected.label.includes('포트')) {
            await selectPort();
        }

        // 상태바 업데이트를 위해 (호출하는 extension.ts에서 수행하도록 할 수 있으나, 일단 여기서는 선택만 진행)
    });

    quickPick.onDidHide(() => quickPick.dispose());
}

/**
 * 연결된 보드와 포트를 자동으로 감지하여 설정합니다.
 */
export async function autoDetectBoardAndPort(): Promise<void> {
    try {
        const connectedPorts = await getConnectedBoards();

        // matching_boards가 있는 포트만 필터링
        const validPorts = connectedPorts.filter(
            (p) => p.matching_boards && p.matching_boards.length > 0
        );

        if (validPorts.length === 0) {
            vscode.window.showWarningMessage('자동 감지 실패: 호환되는 보드가 연결되어 있지 않습니다.');
            return;
        }

        if (validPorts.length > 1) {
            vscode.window.showInformationMessage('여러 개의 보드가 연결되어 있습니다. 수동으로 선택해주세요.');
            await selectBoardAndPort();
            return;
        }

        // 정확히 1개의 보드가 감지된 경우
        const port = validPorts[0];
        const board = port.matching_boards![0];

        updateState({
            selectedPort: port.port.address,
            selectedFqbn: board.fqbn,
            selectedBoardName: board.name,
        });

        vscode.window.showInformationMessage(
            `자동 감지 완료: ${board.name} (${port.port.address})`
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : '알 수 없는 오류';
        vscode.window.showErrorMessage(`자동 감지 중 오류 발생: ${message}`);
    }
}
