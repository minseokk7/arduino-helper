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
            error instanceof Error ? error.message : vscode.l10n.t('Unknown error');
        vscode.window.showErrorMessage(vscode.l10n.t('Failed to get board list: {0}', message));
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
            error instanceof Error ? error.message : vscode.l10n.t('Unknown error');
        vscode.window.showErrorMessage(vscode.l10n.t('Failed to get all boards: {0}', message));
        return [];
    }
}

/**
 * QuickPick으로 보드를 선택합니다.
 * 연결된 보드가 있으면 상단에 표시합니다.
 */
export async function selectBoard(): Promise<void> {
    const quickPick = vscode.window.createQuickPick();
    quickPick.placeholder = vscode.l10n.t('Select a board (searchable)');
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
                label: `$(plug) ${vscode.l10n.t('Connected Boards')}`,
                kind: vscode.QuickPickItemKind.Separator,
            });
            for (const port of connectedBoards) {
                for (const board of port.matching_boards!) {
                    items.push({
                        label: `$(circuit-board) ${board.name}`,
                        description: board.fqbn,
                        detail: vscode.l10n.t('Port: {0}', port.port.address),
                    });
                }
            }
        }

        // 전체 보드 목록
        if (allBoards.length > 0) {
            items.push({
                label: `$(list-unordered) ${vscode.l10n.t('All Boards')}`,
                kind: vscode.QuickPickItemKind.Separator,
            });
            for (const board of allBoards) {
                items.push({
                    label: `$(circuit-board) ${board.name}`,
                    description: board.fqbn,
                    detail: vscode.l10n.t('Platform: {0}', board.platform.name),
                });
            }
        }

        quickPick.busy = false;
        quickPick.items = items;

        quickPick.onDidAccept(async () => {
            const selected = quickPick.selectedItems[0];
            if (selected?.description) {

                // 해당 보드에 맞는 포트 자동 검색
                const matchingPortObj = connectedPorts.find(p =>
                    p.matching_boards?.some(b => b.fqbn === selected.description)
                );
                const matchingPort = matchingPortObj ? matchingPortObj.port.address : undefined;

                updateState({
                    selectedFqbn: selected.description,
                    selectedBoardName: selected.label.replace('$(circuit-board) ', ''),
                    selectedPort: matchingPort
                });

                // IntelliSense 업데이트 호출
                const { updateIntelliSense } = await import('./intellisense');
                await updateIntelliSense();

                if (matchingPort) {
                    vscode.window.showInformationMessage(
                        vscode.l10n.t('Board & Port auto-selected: {0} ({1}) on {2}', selected.label.replace('$(circuit-board) ', ''), selected.description, matchingPort)
                    );
                } else {
                    vscode.window.showInformationMessage(
                        vscode.l10n.t('Board selected: {0} ({1}). Note: No matching port detected.', selected.label.replace('$(circuit-board) ', ''), selected.description)
                    );
                }
            }
            quickPick.dispose();
        });

        quickPick.onDidHide(() => quickPick.dispose());
    } catch (error) {
        quickPick.dispose();
        const message =
            error instanceof Error ? error.message : vscode.l10n.t('Unknown error');
        vscode.window.showErrorMessage(vscode.l10n.t('Board selection failed: {0}', message));
    }
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
            vscode.window.showWarningMessage(vscode.l10n.t('Auto-detect failed: No compatible boards connected.'));
            return;
        }

        if (validPorts.length > 1) {
            vscode.window.showInformationMessage(vscode.l10n.t('Multiple boards connected. Please select manually.'));
            await selectBoard();
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
            vscode.l10n.t('Auto-detect complete: {0} ({1})', board.name, port.port.address)
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : vscode.l10n.t('Unknown error');
        vscode.window.showErrorMessage(vscode.l10n.t('Error during auto-detection: {0}', message));
    }
}
