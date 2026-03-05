/**
 * auto-download.ts — Arduino CLI 자동 다운로드 및 설치 모듈
 * 
 * 시스템에 arduino-cli가 없는 경우 (또는 기본 경로에서 찾을 수 없는 경우)
 * OS에 맞는 릴리즈를 공식 GitHub에서 다운로드하여 확장의 globalStorage 경로에 저장합니다.
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import { checkCliInstalled } from './arduino-cli';
import { exec } from 'child_process';

// 다운로드할 arduino-cli 버전 고정 (안정성 확보)
const CLI_VERSION = '0.35.3';

interface OsMapping {
    urlOs: string;
    urlArch: string;
    ext: string;
    executableName: string;
}

/**
 * 현재 OS 아키텍처와 플랫폼에 맞는 바이너리 정보를 반환합니다.
 */
function getSystemMapping(): OsMapping {
    const platform = process.platform;
    const arch = process.arch;

    let urlOs = '';
    let ext = 'tar.gz';
    let executableName = 'arduino-cli';

    if (platform === 'win32') {
        urlOs = 'Windows';
        ext = 'zip';
        executableName = 'arduino-cli.exe';
    } else if (platform === 'darwin') {
        urlOs = 'macOS';
    } else if (platform === 'linux') {
        urlOs = 'Linux';
    } else {
        throw new Error(`Unsupported platform: ${platform}`);
    }

    let urlArch = '';
    if (arch === 'x64') {
        urlArch = '64bit';
    } else if (arch === 'ia32') {
        urlArch = '32bit';
    } else if (arch === 'arm64') {
        urlArch = 'ARM64';
    } else if (arch === 'arm') {
        urlArch = 'ARMv7';
    } else {
        throw new Error(`Unsupported architecture: ${arch}`);
    }

    return { urlOs, urlArch, ext, executableName };
}

/**
 * URL에서 파일을 다운로드하여 지정된 경로에 저장합니다.
 */
function downloadFile(url: string, destPath: string, onProgress: (percent: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        let receivedBytes = 0;

        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                // Redirect 처리
                if (response.headers.location) {
                    file.close();
                    downloadFile(response.headers.location, destPath, onProgress)
                        .then(resolve)
                        .catch(reject);
                    return;
                }
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: status code ${response.statusCode}`));
                return;
            }

            const totalBytes = parseInt(response.headers['content-length'] || '0', 10);

            response.on('data', (chunk) => {
                receivedBytes += chunk.length;
                if (totalBytes > 0) {
                    const percentage = (receivedBytes / totalBytes) * 100;
                    onProgress(percentage);
                }
            });

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(destPath, () => { }); // 에러 발생 시 부분 파일 삭제
            reject(err);
        });
    });
}

/**
 * 다운로드된 압축 파일을 해제합니다.
 */
function extractArchive(archivePath: string, destDir: string, isZip: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
        let command = '';
        if (isZip && process.platform === 'win32') {
            // Windows PowerShell 방식 압축 해제
            command = `powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${destDir}' -Force"`;
        } else {
            // Linux / macOS tar 명령어
            command = `tar -xzf "${archivePath}" -C "${destDir}"`;
        }

        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Extraction failed: ${stderr || error.message}`));
                return;
            }
            resolve();
        });
    });
}

/**
 * 필요하다면 arduino-cli를 자동으로 다운로드합니다.
 * @param context 확장 프로그램 컨텍스트
 * @returns 사용할 수 있는 최종 실행 파일 경로
 */
export async function installCliIfNeeded(context: vscode.ExtensionContext): Promise<string | undefined> {
    // 1. 이미 시스템(또는 설정된 경로)에 존재하는지 확인
    const installedVersion = await checkCliInstalled();
    if (installedVersion) {
        return undefined; // 설치 불필요
    }

    // 2. 확장의 전역 저장소에 이미 다운로드된 바이너리가 있는지 확인
    const globalStoragePath = context.globalStorageUri.fsPath;
    if (!fs.existsSync(globalStoragePath)) {
        fs.mkdirSync(globalStoragePath, { recursive: true });
    }

    const mapping = getSystemMapping();
    const localExePath = path.join(globalStoragePath, mapping.executableName);

    if (fs.existsSync(localExePath)) {
        // 내부 저장소에 있다면 설정은 무시하고 그걸 쓰도록 리포트
        return localExePath;
    }

    // 3. 없으면 다운로드 및 설치 진행
    return await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: vscode.l10n.t('Downloading Arduino CLI...'),
            cancellable: false,
        },
        async (progress) => {
            try {
                // 다운로드 URL 조립
                const filename = `arduino-cli_${CLI_VERSION}_${mapping.urlOs}_${mapping.urlArch}.${mapping.ext}`;
                const url = `https://github.com/arduino/arduino-cli/releases/download/v${CLI_VERSION}/${filename}`;

                const archivePath = path.join(globalStoragePath, filename);

                // 파일 분할 진행도 로직
                let lastReported = 0;
                await downloadFile(url, archivePath, (percent) => {
                    const intPercent = Math.floor(percent);
                    if (intPercent > lastReported && intPercent % 10 === 0) {
                        progress.report({
                            message: `${intPercent}%`,
                            increment: intPercent - lastReported
                        });
                        lastReported = intPercent;
                    }
                });

                progress.report({ message: vscode.l10n.t('Extracting...') });

                // 압축 해제
                await extractArchive(archivePath, globalStoragePath, mapping.ext === 'zip');

                // 원본 압축 파일 삭제
                fs.unlinkSync(archivePath);

                // Linux/Mac의 경우 실행 권한 부여
                if (process.platform !== 'win32') {
                    fs.chmodSync(localExePath, 0o755);
                }

                vscode.window.showInformationMessage(vscode.l10n.t('Arduino CLI successfully installed!'));
                return localExePath;
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(vscode.l10n.t('Failed to download Arduino CLI: {0}', msg));
                return undefined;
            }
        }
    );
}
