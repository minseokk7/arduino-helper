/**
 * config.ts — Arduino Helper 확장 설정 관리 모듈
 *
 * VS Code 설정에서 arduino-cli 경로, 보드레이트 등을 읽어오고
 * 워크스페이스별 보드/포트 상태를 관리합니다.
 */
import * as vscode from 'vscode';

/** 확장의 전체 설정 구조 */
export interface ArduinoConfig {
    /** arduino-cli 실행 파일 경로 */
    cliPath: string;
    /** 시리얼 모니터 기본 보드레이트 */
    defaultBaudRate: number;
    /** USB 연결 시 보드 자동 감지 여부 */
    autoDetectBoard: boolean;
}

/** 런타임 상태 (현재 선택된 보드/포트) */
export interface ArduinoState {
    /** 현재 선택된 FQBN (Fully Qualified Board Name) */
    selectedFqbn: string | undefined;
    /** 현재 선택된 포트 (예: COM3) */
    selectedPort: string | undefined;
    /** 현재 선택된 보드 이름 (표시용) */
    selectedBoardName: string | undefined;
}

/** 전역 런타임 상태 */
const state: ArduinoState = {
    selectedFqbn: undefined,
    selectedPort: undefined,
    selectedBoardName: undefined,
};

/**
 * VS Code 설정에서 Arduino 확장 설정을 읽어옵니다.
 * @returns 현재 설정 값
 */
export function getConfig(): ArduinoConfig {
    const config = vscode.workspace.getConfiguration('arduino');
    return {
        cliPath: config.get<string>('cliPath', 'arduino-cli'),
        defaultBaudRate: config.get<number>('defaultBaudRate', 9600),
        autoDetectBoard: config.get<boolean>('autoDetectBoard', true),
    };
}

/**
 * 현재 런타임 상태를 반환합니다.
 */
export function getState(): ArduinoState {
    return { ...state };
}

/**
 * 런타임 상태를 업데이트합니다.
 * @param updates 변경할 필드들
 */
export function updateState(updates: Partial<ArduinoState>): void {
    Object.assign(state, updates);
}
