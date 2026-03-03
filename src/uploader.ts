/**
 * uploader.ts — 스케치를 보드에 업로드
 *
 * 컴파일 후 arduino-cli upload 명령으로 보드에 업로드합니다.
 */
import * as vscode from 'vscode';
import { runCli } from './arduino-cli';
import { getState } from './config';
import { compile, getOutputChannel } from './compiler';
import * as path from 'path';

/**
 * 스케치를 컴파일하고 보드에 업로드합니다.
 */
export async function upload(): Promise<void> {
    const state = getState();

    if (!state.selectedFqbn) {
        const action = await vscode.window.showWarningMessage(
            '보드가 선택되지 않았습니다.',
            '보드 선택'
        );
        if (action === '보드 선택') {
            await vscode.commands.executeCommand('arduino.selectBoard');
        }
        return;
    }

    if (!state.selectedPort) {
        const action = await vscode.window.showWarningMessage(
            '포트가 선택되지 않았습니다.',
            '포트 선택'
        );
        if (action === '포트 선택') {
            await vscode.commands.executeCommand('arduino.selectPort');
        }
        return;
    }

    // 스케치 경로 확인
    const sketchPath = getSketchPath();
    if (!sketchPath) {
        vscode.window.showErrorMessage(
            '.ino 파일이 포함된 폴더를 열어주세요.'
        );
        return;
    }

    const outputChannel = getOutputChannel();

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Arduino 업로드 중...',
            cancellable: false,
        },
        async () => {
            try {
                // 먼저 컴파일
                outputChannel.appendLine('');
                outputChannel.appendLine('═'.repeat(60));
                outputChannel.appendLine('📤 업로드 프로세스 시작');
                outputChannel.appendLine('═'.repeat(60));

                // 컴파일 실행
                const compileSuccess = await compile();
                if (!compileSuccess) {
                    return;
                }

                // 업로드 실행
                outputChannel.appendLine('');
                outputChannel.appendLine(
                    `[업로드] 포트: ${state.selectedPort} | 보드: ${state.selectedFqbn}`
                );

                const result = await runCli(
                    [
                        'upload',
                        '-p',
                        state.selectedPort!,
                        '--fqbn',
                        state.selectedFqbn!,
                        sketchPath,
                    ],
                    { timeout: 120_000 }
                );

                if (result.stdout) {
                    outputChannel.appendLine(result.stdout);
                }
                if (result.stderr) {
                    outputChannel.appendLine(result.stderr);
                }

                if (result.exitCode === 0) {
                    outputChannel.appendLine('─'.repeat(60));
                    outputChannel.appendLine('✅ 업로드 성공!');
                    vscode.window.showInformationMessage(
                        `Arduino 업로드 성공! (포트: ${state.selectedPort})`
                    );
                } else {
                    outputChannel.appendLine('─'.repeat(60));
                    outputChannel.appendLine('❌ 업로드 실패');
                    vscode.window.showErrorMessage(
                        '업로드 실패. 포트/보드 연결을 확인하세요.'
                    );
                }
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : '알 수 없는 오류';
                outputChannel.appendLine(`업로드 오류: ${message}`);
                vscode.window.showErrorMessage(`업로드 오류: ${message}`);
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
