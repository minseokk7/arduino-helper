import * as vscode from 'vscode';
import { runCli } from './arduino-cli';

/**
 * .ino 파일이 저장될 때마다 `#include <LibName.h>` 구문을 분석하여
 * 설치되지 않은 라이브러리를 감지하고 설치를 유도합니다.
 */
export function initLibraryDetector(context: vscode.ExtensionContext) {
    const disposable = vscode.workspace.onDidSaveTextDocument(async (document) => {
        if (document.languageId !== 'arduino' && !document.fileName.endsWith('.ino') && !document.fileName.endsWith('.cpp')) {
            return;
        }

        await checkMissingLibraries(document.getText());
    });

    context.subscriptions.push(disposable);
}

/**
 * 텍스트 내의 #include 구문을 찾아 누락된 라이브러리가 있는지 확인합니다.
 */
async function checkMissingLibraries(text: string) {
    // 1. #include <...> 추출
    const includeRegex = /#include\s+<([^>]+)\.h>/g;
    const includedLibs = new Set<string>();
    
    let match;
    while ((match = includeRegex.exec(text)) !== null) {
        includedLibs.add(match[1]);
    }

    if (includedLibs.size === 0) {
        return;
    }

    try {
        // 2. 현재 설치된 라이브러리 목록 가져오기
        const result = await runCli(['lib', 'list', '--format', 'json']);
        if (result.exitCode !== 0) return;

        let installedLibs: any[] = [];
        try {
            installedLibs = JSON.parse(result.stdout) || [];
        } catch {
            return;
        }

        const installedNames = new Set(installedLibs.map((lib: any) => lib.library.name));
        
        // 3. 누락된 라이브러리 필터링 (대소문자 무시 등 휴리스틱 적용 가능하나 기본적으로 이름 매칭)
        const missingLibs = Array.from(includedLibs).filter(lib => !installedNames.has(lib));

        if (missingLibs.length > 0) {
            promptInstallMissingLibraries(missingLibs);
        }
    } catch (e) {
        console.error('Failed to check missing libraries:', e);
    }
}

/**
 * 누락된 라이브러리 설치를 사용자에게 제안합니다.
 */
async function promptInstallMissingLibraries(missingLibs: string[]) {
    const libsStr = missingLibs.join(', ');
    const message = vscode.l10n.t('Detected missing libraries: {0}. Would you like to install them?', libsStr);
    const installBtn = vscode.l10n.t('Install');
    
    const action = await vscode.window.showInformationMessage(message, installBtn, vscode.l10n.t('Ignore'));
    
    if (action === installBtn) {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: vscode.l10n.t('Installing libraries...'),
            cancellable: false
        }, async (progress) => {
            for (const lib of missingLibs) {
                progress.report({ message: lib });
                await runCli(['lib', 'install', lib]);
            }
        });
        vscode.window.showInformationMessage(vscode.l10n.t('Library installation complete.'));
    }
}
