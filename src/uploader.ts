/**
 * uploader.ts — 스케치를 보드에 업로드
 *
 * 컴파일 후 arduino-cli upload 명령으로 보드에 업로드합니다.
 */
import * as vscode from 'vscode';
import { runCli } from './arduino-cli';
import { getState } from './config';
import { compile, getOutputChannel } from './compiler';
import { monitorTerminal, closeSerialMonitor, openSerialMonitor } from './serial-monitor';
import * as path from 'path';

/**
 * 스케치를 컴파일하고 보드에 업로드합니다.
 */
export async function upload(): Promise<void> {
    const state = getState();

    if (!state.selectedFqbn) {
        const action = await vscode.window.showWarningMessage(
            vscode.l10n.t('No board selected.'),
            vscode.l10n.t('Select Board')
        );
        if (action === vscode.l10n.t('Select Board')) {
            await vscode.commands.executeCommand('arduino.selectBoard');
        }
        return;
    }

    if (!state.selectedPort) {
        const action = await vscode.window.showWarningMessage(
            vscode.l10n.t('No port selected.'),
            vscode.l10n.t('Select Port')
        );
        if (action === vscode.l10n.t('Select Port')) {
            await vscode.commands.executeCommand('arduino.selectPort');
        }
        return;
    }

    // 스케치 경로 확인
    const sketchPath = getSketchPath();
    if (!sketchPath) {
        vscode.window.showErrorMessage(
            vscode.l10n.t('Please open a folder containing a .ino file.')
        );
        return;
    }

    const outputChannel = getOutputChannel();

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: vscode.l10n.t('Uploading Arduino...'),
            cancellable: false,
        },
        async () => {
            try {
                // 먼저 컴파일
                outputChannel.appendLine('');
                outputChannel.appendLine('═'.repeat(60));
                outputChannel.appendLine(`📤 ${vscode.l10n.t('Upload process started')}`);
                outputChannel.appendLine('═'.repeat(60));

                // 컴파일 실행
                const compileSuccess = await compile();
                if (!compileSuccess) {
                    return;
                }

                // 업로드 실행
                outputChannel.appendLine('');
                outputChannel.appendLine(
                    vscode.l10n.t('[Upload] Port: {0} | Board: {1}', state.selectedPort!, state.selectedFqbn!)
                );

                // 업로드 전 시리얼 모니터 연결 해제 (포트 충돌 방지)
                const wasSerialMonitorOpen = monitorTerminal !== undefined;
                if (wasSerialMonitorOpen) {
                    closeSerialMonitor();
                    outputChannel.appendLine(vscode.l10n.t('Disconnected Serial Monitor for upload...'));
                }

                // 업로드 후 시리얼 모니터 재연결 전, 빌드 경로 가져오기
                const wFolders = vscode.workspace.workspaceFolders;
                const workspacePath = wFolders && wFolders.length > 0 ? wFolders[0].uri.fsPath : sketchPath;
                const buildPath = path.join(workspacePath, '.vscode', 'build');

                const result = await runCli(
                    [
                        'upload',
                        '-p',
                        state.selectedPort!,
                        '--fqbn',
                        state.selectedFqbn!,
                        '--input-dir',
                        buildPath,
                        sketchPath,
                    ],
                    {
                        timeout: 120_000,
                        onStdout: (data) => outputChannel.append(data),
                        onStderr: (data) => outputChannel.append(data)
                    }
                );

                // 업로드 후 시리얼 모니터 재연결
                if (wasSerialMonitorOpen) {
                    // 약간의 딜레이를 주어 보드가 리부팅될 시간을 확보
                    setTimeout(() => {
                        openSerialMonitor();
                        outputChannel.appendLine(vscode.l10n.t('Reconnected Serial Monitor.'));
                    }, 2000);
                }

                if (result.exitCode === 0) {
                    outputChannel.appendLine('─'.repeat(60));
                    outputChannel.appendLine(`✅ ${vscode.l10n.t('Upload successful!')}`);
                    vscode.window.showInformationMessage(
                        vscode.l10n.t('Arduino upload successful! (Port: {0})', state.selectedPort!)
                    );
                } else {
                    outputChannel.appendLine('─'.repeat(60));
                    outputChannel.appendLine(`❌ ${vscode.l10n.t('Upload failed')}`);
                    vscode.window.showErrorMessage(
                        vscode.l10n.t('Upload failed. Check port/board connection.')
                    );
                }
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : vscode.l10n.t('Unknown error');
                outputChannel.appendLine(vscode.l10n.t('Upload error: {0}', message));
                vscode.window.showErrorMessage(vscode.l10n.t('Upload error: {0}', message));
            }
        }
    );
}

/**
 * 현재 컨텍스트에서 스케치 경로를 추론합니다.
 */
function getSketchPath(): string | undefined {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor?.document.fileName.endsWith('.ino')) {
        return path.dirname(activeEditor.document.fileName);
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        return workspaceFolders[0].uri.fsPath;
    }

    return undefined;
}
