/**
 * serial-monitor.ts — 시리얼 모니터
 *
 * VS Code Terminal API를 사용하여 arduino-cli monitor 를 실행합니다.
 */
import * as vscode from 'vscode';
import { getConfig, getState } from './config';

/** 활성 시리얼 모니터 터미널 */
let monitorTerminal: vscode.Terminal | undefined;

/**
 * 시리얼 모니터를 엽니다.
 * 이미 열려있으면 기존 터미널을 활성화합니다.
 */
export async function openSerialMonitor(): Promise<void> {
    const state = getState();
    const config = getConfig();

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

    // 보드레이트 선택 (QuickPick)
    const baudRates = [
        '9600',
        '19200',
        '38400',
        '57600',
        '115200',
        '230400',
        '460800',
        '921600',
    ];

    const selectedBaud = await vscode.window.showQuickPick(baudRates, {
        placeHolder: `보드레이트 선택 (기본: ${config.defaultBaudRate})`,
    });

    const baudRate = selectedBaud
        ? parseInt(selectedBaud, 10)
        : config.defaultBaudRate;

    // 기존 시리얼 모니터 터미널이 있으면 종료
    if (monitorTerminal) {
        monitorTerminal.dispose();
        monitorTerminal = undefined;
    }

    // 새 터미널에서 시리얼 모니터 실행
    const cliPath = config.cliPath;
    monitorTerminal = vscode.window.createTerminal({
        name: `시리얼 모니터 (${state.selectedPort})`,
        shellPath: cliPath,
        shellArgs: [
            'monitor',
            '-p',
            state.selectedPort!,
            '--config',
            `baudrate=${baudRate}`,
        ],
        iconPath: new vscode.ThemeIcon('plug'),
    });

    monitorTerminal.show();

    // 터미널이 닫히면 참조 정리
    vscode.window.onDidCloseTerminal((terminal) => {
        if (terminal === monitorTerminal) {
            monitorTerminal = undefined;
        }
    });
}

/**
 * 시리얼 모니터를 종료합니다.
 */
export function closeSerialMonitor(): void {
    if (monitorTerminal) {
        monitorTerminal.dispose();
        monitorTerminal = undefined;
    }
}
