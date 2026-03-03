/**
 * extension.ts — Arduino Helper 확장 진입점
 *
 * 모든 명령어를 등록하고 확장의 생명주기를 관리합니다.
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { checkCliInstalled } from './arduino-cli';
import { selectBoard, selectPort, selectBoardAndPort } from './board-manager';
import { initCompiler, compile } from './compiler';
import { upload } from './uploader';
import { openSerialMonitor, closeSerialMonitor } from './serial-monitor';
import { installLibrary, installCore } from './library-manager';
import { initStatusBar, updateStatusBar } from './status-bar';
import { updateState } from './config';
import { autoDetectBoardAndPort } from './board-manager';
import { ArduinoSidebarProvider } from './sidebar';
import { openExample } from './examples-manager';

/**
 * 확장이 활성화될 때 호출됩니다.
 * @param context 확장 컨텍스트
 */
export async function activate(
    context: vscode.ExtensionContext
): Promise<void> {
    // arduino-cli 설치 확인
    const version = await checkCliInstalled();
    if (!version) {
        const action = await vscode.window.showErrorMessage(
            'arduino-cli를 찾을 수 없습니다. 설치 후 다시 시도하세요.',
            '설치 가이드 열기'
        );
        if (action === '설치 가이드 열기') {
            vscode.env.openExternal(
                vscode.Uri.parse('https://arduino.github.io/arduino-cli/latest/installation/')
            );
        }
        return;
    }

    // 컴파일러 및 상태바 초기화
    initCompiler(context);
    initStatusBar(context);

    // 사이드바 등록
    const sidebarProvider = new ArduinoSidebarProvider();
    vscode.window.registerTreeDataProvider('arduino-helper-view', sidebarProvider);

    // 명령어 등록
    const commands: Array<{
        id: string;
        handler: (...args: unknown[]) => unknown;
    }> = [
            {
                id: 'arduino.selectBoard',
                handler: async () => {
                    await selectBoard();
                    updateStatusBar();
                },
            },
            {
                id: 'arduino.selectPort',
                handler: async () => {
                    await selectPort();
                    updateStatusBar();
                },
            },
            {
                id: 'arduino.selectBoardAndPort',
                handler: async () => {
                    await selectBoardAndPort();
                    updateStatusBar();
                }
            },
            {
                id: 'arduino.autoDetect',
                handler: async () => {
                    await autoDetectBoardAndPort();
                    updateStatusBar();
                }
            },
            {
                id: 'arduino.compile',
                handler: compile,
            },
            {
                id: 'arduino.upload',
                handler: upload,
            },
            {
                id: 'arduino.serialMonitor',
                handler: openSerialMonitor,
            },
            {
                id: 'arduino.installLibrary',
                handler: installLibrary,
            },
            {
                id: 'arduino.newSketch',
                handler: newSketch,
            },
            {
                id: 'arduino.installCore',
                handler: installCore,
            },
            {
                id: 'arduino.openExample',
                handler: openExample,
            }
        ];

    for (const cmd of commands) {
        const disposable = vscode.commands.registerCommand(cmd.id, cmd.handler);
        context.subscriptions.push(disposable);
    }
}

/**
 * 새 Arduino 스케치를 생성합니다.
 */
async function newSketch(): Promise<void> {
    // 스케치 이름 입력
    const sketchName = await vscode.window.showInputBox({
        prompt: '스케치 이름을 입력하세요',
        placeHolder: '예: Blink, ServoTest, SensorReader',
        validateInput: (value) => {
            if (!value) {
                return '스케치 이름을 입력해주세요';
            }
            if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) {
                return '영문/숫자/밑줄만 사용 가능 (영문으로 시작)';
            }
            return null;
        },
    });

    if (!sketchName) {
        return;
    }

    // 스케치 위치 선택
    const defaultUri = vscode.workspace.workspaceFolders?.[0]?.uri;
    const targetFolder = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: '스케치 생성 위치 선택',
        defaultUri,
    });

    if (!targetFolder || targetFolder.length === 0) {
        return;
    }

    const sketchDir = path.join(targetFolder[0].fsPath, sketchName);
    const sketchFile = path.join(sketchDir, `${sketchName}.ino`);

    // 디렉토리 생성
    try {
        fs.mkdirSync(sketchDir, { recursive: true });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : '알 수 없는 오류';
        vscode.window.showErrorMessage(`스케치 폴더 생성 실패: ${message}`);
        return;
    }

    // 기본 템플릿 코드
    const template = `/**
 * ${sketchName} — Arduino 스케치
 * 생성일: ${new Date().toISOString().split('T')[0]}
 */

/**
 * 초기 설정 — 보드 전원 켜질 때 한 번 실행됩니다.
 */
void setup() {
  // 시리얼 통신 초기화 (보드레이트: 9600)
  Serial.begin(9600);

  // TODO: 핀 모드 설정, 초기화 코드 작성
}

/**
 * 메인 루프 — setup() 실행 후 무한 반복됩니다.
 */
void loop() {
  // TODO: 반복 실행할 코드 작성
}
`;

    try {
        fs.writeFileSync(sketchFile, template, 'utf-8');

        // 생성된 파일 열기
        const doc = await vscode.workspace.openTextDocument(sketchFile);
        await vscode.window.showTextDocument(doc);

        vscode.window.showInformationMessage(
            `✅ 새 스케치 "${sketchName}" 생성 완료!`
        );
    } catch (error) {
        const message =
            error instanceof Error ? error.message : '알 수 없는 오류';
        vscode.window.showErrorMessage(`스케치 파일 생성 실패: ${message}`);
    }
}

/**
 * 확장이 비활성화될 때 호출됩니다.
 */
export function deactivate(): void {
    closeSerialMonitor();
}
