/**
 * compiler.ts — 스케치 컴파일 및 에러 파싱
 *
 * arduino-cli compile 을 실행하고
 * 컴파일 에러를 VS Code Diagnostics로 매핑합니다.
 */
import * as vscode from 'vscode';
import { runCli } from './arduino-cli';
import { getState } from './config';
import * as path from 'path';

/** 컴파일 에러를 담을 DiagnosticCollection */
let diagnosticCollection: vscode.DiagnosticCollection;

/** 출력 채널 */
let outputChannel: vscode.OutputChannel;

/**
 * 컴파일러 모듈을 초기화합니다.
 * @param context 확장 컨텍스트
 */
export function initCompiler(context: vscode.ExtensionContext): void {
    diagnosticCollection =
        vscode.languages.createDiagnosticCollection('arduino');
    context.subscriptions.push(diagnosticCollection);

    outputChannel = vscode.window.createOutputChannel('Arduino');
    context.subscriptions.push(outputChannel);
}

/**
 * 컴파일 에러 문자열을 파싱하여 Diagnostic 배열로 변환합니다.
 * GCC 에러 형식: 파일경로:줄번호:컬럼: error/warning: 메시지
 * @param output 컴파일 출력 텍스트
 * @returns 파일별 Diagnostic 맵
 */
function parseCompileErrors(
    output: string
): Map<string, vscode.Diagnostic[]> {
    const diagnosticMap = new Map<string, vscode.Diagnostic[]>();
    // GCC 형식: /path/file.ino:10:5: error: expected ';'
    const errorRegex =
        /^(.+?):(\d+):(\d+):\s*(error|warning|note):\s*(.+)$/gm;

    let match: RegExpExecArray | null;
    while ((match = errorRegex.exec(output)) !== null) {
        const [, filePath, lineStr, colStr, severity, message] = match;
        const line = Math.max(0, parseInt(lineStr, 10) - 1);
        const col = Math.max(0, parseInt(colStr, 10) - 1);

        const diagSeverity =
            severity === 'error'
                ? vscode.DiagnosticSeverity.Error
                : severity === 'warning'
                    ? vscode.DiagnosticSeverity.Warning
                    : vscode.DiagnosticSeverity.Information;

        const range = new vscode.Range(line, col, line, col + 1);
        const diagnostic = new vscode.Diagnostic(range, message, diagSeverity);
        diagnostic.source = 'Arduino';

        const normalizedPath = path.normalize(filePath);
        const existing = diagnosticMap.get(normalizedPath) ?? [];
        existing.push(diagnostic);
        diagnosticMap.set(normalizedPath, existing);
    }

    return diagnosticMap;
}

/**
 * 현재 열린 스케치를 컴파일합니다.
 */
export async function compile(): Promise<boolean> {
    const state = getState();

    if (!state.selectedFqbn) {
        const action = await vscode.window.showWarningMessage(
            '보드가 선택되지 않았습니다.',
            '보드 선택'
        );
        if (action === '보드 선택') {
            await vscode.commands.executeCommand('arduino.selectBoard');
        }
        return false;
    }

    // 현재 워크스페이스 또는 열린 파일의 디렉토리를 스케치 경로로 사용
    const sketchPath = getSketchPath();
    if (!sketchPath) {
        vscode.window.showErrorMessage(
            '.ino 파일이 포함된 폴더를 열어주세요.'
        );
        return false;
    }

    // 이전 진단 정보 초기화
    diagnosticCollection.clear();

    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine(
        `[컴파일 시작] 보드: ${state.selectedBoardName} (${state.selectedFqbn})`
    );
    outputChannel.appendLine(`[스케치 경로] ${sketchPath}`);
    outputChannel.appendLine('─'.repeat(60));

    try {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Arduino 컴파일 중...',
                cancellable: false,
            },
            async () => {
                const result = await runCli(
                    ['compile', '--fqbn', state.selectedFqbn!, sketchPath],
                    { timeout: 120_000 }
                );

                // 출력 표시
                if (result.stdout) {
                    outputChannel.appendLine(result.stdout);
                }
                if (result.stderr) {
                    outputChannel.appendLine(result.stderr);
                }

                if (result.exitCode === 0) {
                    outputChannel.appendLine('─'.repeat(60));
                    outputChannel.appendLine('✅ 컴파일 성공!');
                    vscode.window.showInformationMessage('Arduino 컴파일 성공!');
                } else {
                    outputChannel.appendLine('─'.repeat(60));
                    outputChannel.appendLine('❌ 컴파일 실패');

                    // 에러 파싱 및 Diagnostics 등록
                    const fullOutput = `${result.stdout}\n${result.stderr}`;
                    const diagnosticMap = parseCompileErrors(fullOutput);

                    for (const [filePath, diagnostics] of diagnosticMap) {
                        const uri = vscode.Uri.file(filePath);
                        diagnosticCollection.set(uri, diagnostics);
                    }

                    vscode.window.showErrorMessage('Arduino 컴파일 실패. 출력 채널을 확인하세요.');
                }

                return result.exitCode === 0;
            }
        );
        return true;
    } catch (error) {
        const message =
            error instanceof Error ? error.message : '알 수 없는 오류';
        outputChannel.appendLine(`오류: ${message}`);
        vscode.window.showErrorMessage(`컴파일 오류: ${message}`);
        return false;
    }
}

/**
 * 현재 컨텍스트에서 스케치 경로를 추론합니다.
 * @returns 스케치 디렉토리 경로 또는 undefined
 */
function getSketchPath(): string | undefined {
    // 현재 열린 파일이 .ino인 경우 해당 파일의 디렉토리
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor?.document.fileName.endsWith('.ino')) {
        return path.dirname(activeEditor.document.fileName);
    }

    // 워크스페이스 폴더 사용
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        return workspaceFolders[0].uri.fsPath;
    }

    return undefined;
}

/**
 * 출력 채널 인스턴스를 반환합니다 (다른 모듈에서 사용).
 */
export function getOutputChannel(): vscode.OutputChannel {
    return outputChannel;
}
