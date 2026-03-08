import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { updateState, getState } from './config';

/**
 * 스케치가 생성될 기본 위치를 설정합니다.
 */
export async function setSketchLocation(): Promise<void> {
    const targetFolder = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: vscode.l10n.t('Select default sketch location'),
    });

    if (targetFolder && targetFolder.length > 0) {
        updateState({ defaultSketchPath: targetFolder[0].fsPath });
        vscode.window.showInformationMessage(
            vscode.l10n.t('Default sketch location set: {0}', targetFolder[0].fsPath)
        );
    }
}

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

    const state = getState();
    let selectedPath: string | undefined = state.defaultSketchPath;

    // 저장된 위치가 없다면 현재 열려있는 워크스페이스를 기본값으로 사용
    if (!selectedPath) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            selectedPath = workspaceFolders[0].uri.fsPath;
        } else {
            const targetFolder = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: vscode.l10n.t('Select sketch creation location'),
            });

            if (!targetFolder || targetFolder.length === 0) {
                return;
            }
            selectedPath = targetFolder[0].fsPath;
        }
    }

    // [버그 수정] 사용자가 선택한 경로가 "이미 존재하는 스케치 폴더" 내부라면,
    // 스케치를 중첩 생성하지 않고 부모 폴더(상위 폴더)로 위치를 자동 조정합니다.
    let detectPath = selectedPath;
    while (detectPath && detectPath !== path.dirname(detectPath)) {
        const dirName = path.basename(detectPath);
        if (fs.existsSync(path.join(detectPath, `${dirName}.ino`))) {
            // 선택된 경로가 스케치 폴더임. 해당 스케치 폴더와 같은 레벨에 생성.
            selectedPath = path.dirname(detectPath);
            break;
        }
        detectPath = path.dirname(detectPath);
    }

    // Arduino 스타일: 폴더명과 .ino 파일명이 같아야 함.
    const isAlreadySketchFolder = path.basename(selectedPath).toLowerCase() === sketchName.toLowerCase();
    
    const sketchDir = isAlreadySketchFolder ? selectedPath : path.join(selectedPath, sketchName);
    const sketchFile = path.join(sketchDir, `${sketchName}.ino`);

    // 파일 중복 체크
    if (fs.existsSync(sketchFile)) {
        vscode.window.showErrorMessage(
            vscode.l10n.t('A sketch with this name already exists in the selected location: {0}', sketchFile)
        );
        return;
    }

    // 디렉토리 생성 (이미 존재하면 건너뜀)
    try {
        if (!fs.existsSync(sketchDir)) {
            fs.mkdirSync(sketchDir, { recursive: true });
        }
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
 * 활성 작업 영역(또는 현재 활성화된 스케치 폴더) 내부에
 * 새 폴더를 만들지 않고 .ino 파일을 직접 추가합니다.
 */
export async function addSketchFile(): Promise<void> {
    const fileName = await vscode.window.showInputBox({
        prompt: vscode.l10n.t('Enter new sketch file name (without .ino)'),
        placeHolder: vscode.l10n.t('e.g.: Helpers, Definitions'),
        validateInput: (value) => {
            if (!value) {
                return vscode.l10n.t('Please enter a file name');
            }
            if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) {
                return vscode.l10n.t('Only letters, numbers, underscores allowed (must start with a letter)');
            }
            return null;
        },
    });

    if (!fileName) {
        return;
    }

    let targetPath: string | undefined = undefined;

    // 현재 열려있는 파일의 디렉토리를 우선 확인
    if (vscode.window.activeTextEditor) {
        targetPath = path.dirname(vscode.window.activeTextEditor.document.uri.fsPath);
    } else {
        // 열린 파일이 없으면 첫 번째 워크스페이스 사용
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            targetPath = workspaceFolders[0].uri.fsPath;
        }
    }

    if (!targetPath) {
        vscode.window.showErrorMessage(vscode.l10n.t('Please open an Arduino project folder first to add a file.'));
        return;
    }

    const filePath = path.join(targetPath, `${fileName}.ino`);

    if (fs.existsSync(filePath)) {
        vscode.window.showErrorMessage(
            vscode.l10n.t('A file with this name already exists: {0}', filePath)
        );
        return;
    }

    const template = `/**
 * ${fileName}.ino
 * Created: ${new Date().toISOString().split('T')[0]}
 */

// ${vscode.l10n.t('Add your helper functions or additional sketch code here.')}
`;

    try {
        fs.writeFileSync(filePath, template, 'utf-8');

        // 생성된 파일 열기
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc);
        
        vscode.window.showInformationMessage(
            `✅ ${vscode.l10n.t('Added file "{0}.ino" to current sketch!', fileName)}`
        );
    } catch (error) {
        const message =
            error instanceof Error ? error.message : vscode.l10n.t('Unknown error');
        vscode.window.showErrorMessage(vscode.l10n.t('Failed to create file: {0}', message));
    }
}

