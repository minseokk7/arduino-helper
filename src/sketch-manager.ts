import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 새 Arduino 스케치를 생성합니다.
 */
export async function newSketch(): Promise<void> {
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
