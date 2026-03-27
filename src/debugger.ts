/**
 * debugger.ts — 하드웨어 디버깅 지원 (Cortex-Debug)
 *
 * 선택된 보드의 FQBN을 분석하여 Cortex-Debug 확장 프로그램에서 
 * 사용할 수 있는 표준 launch.json 템플릿을 자동으로 생성해줍니다.
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getState } from './config';

export async function generateDebugConfig(): Promise<void> {
    const state = getState();

    if (!state.selectedFqbn) {
        vscode.window.showWarningMessage(vscode.l10n.t('Please select a board first before generating debug config.'));
        return;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage(vscode.l10n.t('Please open a folder to generate launch.json.'));
        return;
    }

    const vscodeDir = path.join(workspaceFolders[0].uri.fsPath, '.vscode');
    if (!fs.existsSync(vscodeDir)) {
        fs.mkdirSync(vscodeDir, { recursive: true });
    }

    const launchJsonPath = path.join(vscodeDir, 'launch.json');

    // 타겟 보드별 설정 추론 로직 (FQBN 기반 휴리스틱)
    const fqbn = state.selectedFqbn.toLowerCase();
    let target = 'auto';
    let svdFile = '';

    if (fqbn.includes('rp2040')) {
        target = 'rp2040';
        svdFile = 'RP2040.svd';
    } else if (fqbn.includes('samd') || fqbn.includes('mkr')) {
        target = 'at91samd21g18';
    } else if (fqbn.includes('stm32')) {
        target = 'stm32';
    } else if (fqbn.includes('nrf52')) {
        target = 'nrf52';
    } else if (fqbn.includes('minima') || fqbn.includes('renesas')) {
        target = 'renesas_ra4m1';
    }

    // 기본 launch.json 구조
    const debugConfig = {
        version: "0.2.0",
        configurations: [
            {
                name: "Arduino: Debug (OpenOCD)",
                type: "cortex-debug",
                request: "launch",
                servertype: "openocd",
                cwd: "${workspaceFolder}",
                // 컴파일 경로 (.vscode/build 폴더 안의 elf 파일 위치)
                executable: "${workspaceFolder}/.vscode/build/${fileBasenameNoExtension}.ino.elf",
                runToEntryPoint: "setup",
                device: target,
                svdFile: svdFile ? `\${workspaceFolder}/${svdFile}` : undefined,
                configFiles: [
                    // 기본적인 DAP 링커 스크립트 (사용자가 보드에 맞게 수정 필요)
                    "interface/cmsis-dap.cfg",
                    `target/${target}.cfg`
                ],
                preLaunchTask: "Arduino: Compile Sketch" // 빌드 테스크(task.ts)와 자동 연결
            }
        ]
    };

    let existingConfig: any = { version: "0.2.0", configurations: [] };

    // 기존 설정 파일 존재 여부 확인 후 병합
    if (fs.existsSync(launchJsonPath)) {
        try {
            existingConfig = JSON.parse(fs.readFileSync(launchJsonPath, 'utf8'));
        } catch (e) {
            // 파싱 에러
        }
    }

    // 중복 확인 후 삽입
    const configExists = existingConfig.configurations?.some((c: any) => c.name === "Arduino: Debug (OpenOCD)");
    if (!configExists) {
        if (!existingConfig.configurations) {
            existingConfig.configurations = [];
        }
        existingConfig.configurations.push(debugConfig.configurations[0]);
    }

    // 저장
    fs.writeFileSync(launchJsonPath, JSON.stringify(existingConfig, null, 4), 'utf8');

    // 에디터 열어주기
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(launchJsonPath));
    await vscode.window.showTextDocument(doc);

    vscode.window.showInformationMessage(
        vscode.l10n.t('Generated Cortex-Debug configuration for {0}', state.selectedBoardName || target)
    );
}
