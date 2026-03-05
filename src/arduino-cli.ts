/**
 * arduino-cli.ts — arduino-cli 프로세스 실행 래퍼
 *
 * 모든 arduino-cli 명령을 이 모듈을 통해 실행합니다.
 * JSON 출력 모드를 활용하여 안정적으로 결과를 파싱합니다.
 */
import { spawn } from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import { getConfig } from './config';

/** arduino-cli 실행 결과 */
export interface CliResult {
    /** 표준 출력 */
    stdout: string;
    /** 표준 에러 */
    stderr: string;
    /** 종료 코드 */
    exitCode: number;
}

/** arduino-cli JSON 출력을 파싱한 결과 */
export interface CliJsonResult<T = unknown> {
    /** 파싱된 데이터 */
    data: T;
    /** 원본 실행 결과 */
    raw: CliResult;
}

/**
 * CLI 경로가 확장자 없이 지정된 경우 Windows에서 .exe를 추가합니다.
 * @param cliPath 원본 CLI 경로
 * @returns 보정된 CLI 경로
 */
function resolveCliPath(cliPath: string): string {
    if (process.platform === 'win32' && !path.extname(cliPath)) {
        return `${cliPath}.exe`;
    }
    return cliPath;
}

/**
 * arduino-cli 명령을 실행합니다.
 * @param args 명령 인수 배열
 * @param options 추가 옵션
 * @returns 실행 결과
 * @throws 프로세스 실행 실패 시
 */
export function runCli(
    args: string[],
    options?: { cwd?: string; timeout?: number }
): Promise<CliResult> {
    return new Promise((resolve, reject) => {
        const config = getConfig();
        const cliPath = resolveCliPath(config.cliPath);

        // shell: false를 사용하여 인수를 직접 전달합니다.
        // 이렇게 하면 공백이 포함된 경로도 단일 인수로 올바르게 전달됩니다.
        const proc = spawn(cliPath, args, {
            cwd: options?.cwd,
            env: { ...process.env },
            windowsHide: true,
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (chunk: Buffer) => {
            stdout += chunk.toString();
        });

        proc.stderr.on('data', (chunk: Buffer) => {
            stderr += chunk.toString();
        });

        // 타임아웃 처리 (기본 60초)
        const timeoutMs = options?.timeout ?? 60_000;
        const timer = setTimeout(() => {
            proc.kill('SIGTERM');
            reject(new Error(vscode.l10n.t('arduino-cli execution timed out ({0}s)', timeoutMs / 1000)));
        }, timeoutMs);

        proc.on('close', (code) => {
            clearTimeout(timer);
            resolve({
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                exitCode: code ?? 1,
            });
        });

        proc.on('error', (err) => {
            clearTimeout(timer);
            reject(
                new Error(
                    vscode.l10n.t(
                        'arduino-cli execution failed: {0}\nCheck the path (Setting: arduino.cliPath)',
                        err.message
                    )
                )
            );
        });
    });
}

/**
 * arduino-cli 명령을 JSON 모드로 실행하고 결과를 파싱합니다.
 * @param args 명령 인수 배열 (--format json 자동 추가)
 * @param options 추가 옵션
 * @returns 파싱된 JSON 결과
 * @throws JSON 파싱 실패 또는 프로세스 실행 실패 시
 */
export async function runCliJson<T = unknown>(
    args: string[],
    options?: { cwd?: string; timeout?: number }
): Promise<CliJsonResult<T>> {
    // --format json 을 인수에 추가
    const jsonArgs = [...args, '--format', 'json'];
    const raw = await runCli(jsonArgs, options);

    try {
        const data = JSON.parse(raw.stdout) as T;
        return { data, raw };
    } catch {
        throw new Error(
            vscode.l10n.t(
                'arduino-cli JSON parse failed:\nCommand: arduino-cli {0}\nOutput: {1}\nError: {2}',
                jsonArgs.join(' '),
                raw.stdout,
                raw.stderr
            )
        );
    }
}

/**
 * arduino-cli가 올바르게 설치되어 있는지 확인합니다.
 * @returns 버전 문자열 또는 null (미설치 시)
 */
export async function checkCliInstalled(): Promise<string | null> {
    try {
        const result = await runCli(['version']);
        if (result.exitCode === 0) {
            // "arduino-cli  Version: 1.3.25 ..." 형태에서 버전 추출
            const match = result.stdout.match(/Version:\s*(\S+)/);
            return match ? match[1] : result.stdout;
        }
        return null;
    } catch {
        return null;
    }
}
