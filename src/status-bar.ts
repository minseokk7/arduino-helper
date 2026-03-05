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
let autoDetectStatusBarItem: vscode.StatusBarItem;
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
    configurationStatusBarItem.command = 'arduino.selectBoard';
    configurationStatusBarItem.tooltip = vscode.l10n.t('Click to select Arduino board');
    context.subscriptions.push(configurationStatusBarItem);

    // 자동감지 상태바 (우선순위: 99 → 보드 선택 우측)
    autoDetectStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        99
    );
    autoDetectStatusBarItem.command = 'arduino.autoDetect';
    autoDetectStatusBarItem.text = '$(zap)';
    autoDetectStatusBarItem.tooltip = vscode.l10n.t('Auto Detect Board & Port');
    autoDetectStatusBarItem.show();
    context.subscriptions.push(autoDetectStatusBarItem);

    // 컴파일 상태바 (우선순위: 98)
    compileStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        98
    );
    compileStatusBarItem.command = 'arduino.compile';
    compileStatusBarItem.text = '$(check)';
    compileStatusBarItem.tooltip = vscode.l10n.t('Arduino: Verify (Compile)');
    compileStatusBarItem.show();
    context.subscriptions.push(compileStatusBarItem);

    // 업로드 상태바 (우선순위: 97)
    uploadStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        97
    );
    uploadStatusBarItem.command = 'arduino.upload';
    uploadStatusBarItem.text = '$(arrow-right)';
    uploadStatusBarItem.tooltip = vscode.l10n.t('Arduino: Upload');
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

    const boardText = state.selectedBoardName ? state.selectedBoardName : vscode.l10n.t('Select Board');
    const portText = state.selectedPort ? state.selectedPort : vscode.l10n.t('Select Port');

    configurationStatusBarItem.text = `$(circuit-board) ${boardText} | $(plug) ${portText}`;
    configurationStatusBarItem.show();
}
