import * as vscode from 'vscode';
import { runCli } from './arduino-cli';
import * as path from 'path';
import * as fs from 'fs';

/**
 * .ino 파일에 대한 자동 포맷터 프로바이더
 * 
 * clang-format을 사용하여 코드를 포맷팅합니다.
 * (시스템에 clang-format이 설치되어 있거나 C/C++ 확장이 제공하는 경우 사용)
 */
export class ArduinoDocumentFormattingEditProvider implements vscode.DocumentFormattingEditProvider {
    
    public async provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ): Promise<vscode.TextEdit[]> {
        
        // 1. clang-format 바이너리 탐색 (C/C++ 확장 경로 등)
        const clangFormatPath = this.getClangFormatPath();
        
        if (!clangFormatPath) {
            vscode.window.showWarningMessage(
                vscode.l10n.t('clang-format not found. Please install C/C++ extension or clang-format to enable auto-formatting.')
            );
            return [];
        }

        try {
            // 임시 파일에 현재 내용을 저장 (clang-format은 파일 입력을 선호)
            const tempDir = path.join(__dirname, '..', '.tmp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            const tempFilePath = path.join(tempDir, `temp_${Date.now()}.cpp`);
            fs.writeFileSync(tempFilePath, document.getText(), 'utf8');

            // clang-format 실행 (-style=file --fallback-style=Google)
            const { spawnSync } = require('child_process');
            const result = spawnSync(clangFormatPath, ['-style=file', '--fallback-style=Google', tempFilePath], {
                encoding: 'utf8',
                cwd: path.dirname(document.fileName)
            });

            // 임시 파일 삭제
            fs.unlinkSync(tempFilePath);

            if (result.error) {
                console.error('Format error:', result.error);
                return [];
            }

            if (result.status === 0 && result.stdout) {
                // 전체 문서를 포맷팅된 텍스트로 교체
                const fullRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(document.getText().length)
                );
                return [vscode.TextEdit.replace(fullRange, result.stdout)];
            }
            
            return [];
        } catch (error) {
            console.error('Failed to format document:', error);
            return [];
        }
    }

    /**
     * 시스템 또는 C/C++ 확장에 포함된 clang-format 경로를 찾습니다.
     */
    private getClangFormatPath(): string | undefined {
        // C/C++ 확장 경로 확인
        const cppExtension = vscode.extensions.getExtension('ms-vscode.cpptools');
        if (cppExtension) {
            const extPath = cppExtension.extensionPath;
            const platform = process.platform;
            
            let binName = 'clang-format';
            let binFolder = '';
            
            if (platform === 'win32') {
                binName = 'clang-format.exe';
                binFolder = 'LLVM/bin'; // cpptools 구조에 따라 다름
            } else if (platform === 'darwin') {
                binFolder = 'LLVM/bin';
            } else if (platform === 'linux') {
                binFolder = 'LLVM/bin';
            }

            // cpptools 확장의 알려진 경로들 검사
            const possiblePaths = [
                path.join(extPath, binFolder, binName),
                path.join(extPath, 'bin', binName),
            ];

            for (const p of possiblePaths) {
                if (fs.existsSync(p)) {
                    return p;
                }
            }
        }

        // 시스템 PATH에서 clang-format 찾기 (which / where)
        const { spawnSync } = require('child_process');
        const cmd = process.platform === 'win32' ? 'where' : 'which';
        const result = spawnSync(cmd, ['clang-format'], { encoding: 'utf8' });
        
        if (result.status === 0 && result.stdout) {
            const paths = result.stdout.split('\n');
            if (paths.length > 0 && paths[0].trim()) {
                return paths[0].trim();
            }
        }

        return undefined;
    }
}
