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
            vscode.l10n.t('arduino-cli not found. Please install it and try again.'),
            vscode.l10n.t('Open Installation Guide')
        );
        if (action === vscode.l10n.t('Open Installation Guide')) {
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
        prompt: vscode.l10n.t('Enter sketch name'),
        placeHolder: vscode.l10n.t('e.g.: Blink, ServoTest, SensorReader'),
        validateInput: (value) => {
            if (!value) {
                return vscode.l10n.t('Please enter a sketch name');
            }
            if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) {
                return vscode.l10n.t('Only letters, numbers, underscores allowed (must start with a letter)');
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
        openLabel: vscode.l10n.t('Select sketch creation location'),
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
            error instanceof Error ? error.message : vscode.l10n.t('Unknown error');
        vscode.window.showErrorMessage(vscode.l10n.t('Failed to create sketch folder: {0}', message));
        return;
    }

    // 기본 템플릿 코드
    const template = `/**
 * ${sketchName} — Arduino Sketch
 * Created: ${new Date().toISOString().split('T')[0]}
 */

/**
 * ${vscode.l10n.t('Initial setup — Runs once when board powers on.')}
 */
void setup() {
  // ${vscode.l10n.t('Initialize serial communication (baud rate: 9600)')}
  Serial.begin(9600);

  // ${vscode.l10n.t('TODO: Set pin modes, write initialization code')}
}

/**
 * ${vscode.l10n.t('Main loop — Repeats indefinitely after setup().')}
 */
void loop() {
  // ${vscode.l10n.t('TODO: Write code to repeat')}
}
`;

    try {
        fs.writeFileSync(sketchFile, template, 'utf-8');

        // 생성된 파일 열기
        const doc = await vscode.workspace.openTextDocument(sketchFile);
        await vscode.window.showTextDocument(doc);

        vscode.window.showInformationMessage(
            `✅ ${vscode.l10n.t('New sketch "{0}" created!', sketchName)}`
        );
    } catch (error) {
        const message =
            error instanceof Error ? error.message : vscode.l10n.t('Unknown error');
        vscode.window.showErrorMessage(vscode.l10n.t('Failed to create sketch file: {0}', message));
    }
}

/**
 * 확장이 비활성화될 때 호출됩니다.
 */
export function deactivate(): void {
    closeSerialMonitor();
}
