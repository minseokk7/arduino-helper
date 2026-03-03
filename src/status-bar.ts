/**
 * status-bar.ts — VS Code 하단 상태바 UI
 *
 * 현재 선택된 보드와 포트를 상태바에 표시합니다.
 * 클릭 시 보드/포트 선택 명령을 실행합니다.
 */
import * as vscode from 'vscode';
import { getState } from './config';

/** 통합 상태바 아이템 */
let configurationStatusBarItem: vscode.StatusBarItem;
let compileStatusBarItem: vscode.StatusBarItem;
let uploadStatusBarItem: vscode.StatusBarItem;

/**
 * 상태바를 초기화합니다.
 * @param context 확장 컨텍스트
 */
export function initStatusBar(context: vscode.ExtensionContext): void {
    // 통합 상태바 (우선순위: 100 → 좌측에 표시)
    configurationStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100
    );
    configurationStatusBarItem.command = 'arduino.selectBoardAndPort';
    configurationStatusBarItem.tooltip = '클릭하여 Arduino 보드 및 포트 선택';
    context.subscriptions.push(configurationStatusBarItem);

    // 컴파일 상태바 (우선순위: 99)
    compileStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        99
    );
    compileStatusBarItem.command = 'arduino.compile';
    compileStatusBarItem.text = '$(check)';
    compileStatusBarItem.tooltip = 'Arduino: 확인 (컴파일)';
    compileStatusBarItem.show();
    context.subscriptions.push(compileStatusBarItem);

    // 업로드 상태바 (우선순위: 98)
    uploadStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        98
    );
    uploadStatusBarItem.command = 'arduino.upload';
    uploadStatusBarItem.text = '$(arrow-right)';
    uploadStatusBarItem.tooltip = 'Arduino: 업로드';
    uploadStatusBarItem.show();
    context.subscriptions.push(uploadStatusBarItem);

    // 초기 상태 업데이트
    updateStatusBar();
}

/**
 * 상태바 텍스트를 현재 상태에 맞게 업데이트합니다.
 */
export function updateStatusBar(): void {
    const state = getState();

    const boardText = state.selectedBoardName ? state.selectedBoardName : '보드 선택';
    const portText = state.selectedPort ? state.selectedPort : '포트 선택';

    configurationStatusBarItem.text = `$(circuit-board) ${boardText} | $(plug) ${portText}`;
    configurationStatusBarItem.show();
}
