import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { runCli } from './arduino-cli';
import { getOutputChannel } from './compiler';

interface ArduinoJson {
    libraries?: string[];
}

export async function checkAndInstallDependencies() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;
    const configPath = path.join(workspacePath, 'arduino.json');

    try {
        await fs.access(configPath);
    } catch {
        // No arduino.json found, skip
        return;
    }

    try {
        const content = await fs.readFile(configPath, 'utf-8');
        const config: ArduinoJson = JSON.parse(content);

        if (!config.libraries || !Array.isArray(config.libraries) || config.libraries.length === 0) {
            return;
        }

        const requiredLibs = config.libraries;
        
        // Fetch currently installed libraries
        const result = await runCli(['lib', 'list', '--format', 'json']);
        if (result.exitCode !== 0) {
            return;
        }

        let installedLibs: any[] = [];
        try {
            installedLibs = JSON.parse(result.stdout) || [];
        } catch {
            return;
        }

        const installedNames = new Set(installedLibs.map((lib: any) => lib.library.name));
        const missingLibs = requiredLibs.filter(lib => !installedNames.has(lib));

        if (missingLibs.length === 0) {
            return; // All dependencies met
        }

        const message = vscode.l10n.t('Missing Arduino libraries found in arduino.json: {0}. Install them now?', missingLibs.join(', '));
        const installBtn = vscode.l10n.t('Install');
        const ignoreBtn = vscode.l10n.t('Ignore');

        const selection = await vscode.window.showInformationMessage(message, installBtn, ignoreBtn);

        if (selection === installBtn) {
            const outputChannel = getOutputChannel();
            outputChannel.show(true);
            outputChannel.appendLine('─'.repeat(60));
            outputChannel.appendLine(vscode.l10n.t('Installing missing libraries from arduino.json...'));

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: vscode.l10n.t('Installing Arduino libraries...'),
                cancellable: false
            }, async (progress) => {
                for (const lib of missingLibs) {
                    progress.report({ message: lib });
                    outputChannel.appendLine(`> arduino-cli lib install "${lib}"`);
                    const installRes = await runCli(['lib', 'install', lib]);
                    if (installRes.exitCode === 0) {
                        outputChannel.appendLine(`✅ ${lib} installed successfully.`);
                    } else {
                        outputChannel.appendLine(`❌ Failed to install ${lib}: ${installRes.stderr}`);
                    }
                }
            });

            outputChannel.appendLine(vscode.l10n.t('Done installing dependencies.'));
            outputChannel.appendLine('─'.repeat(60));
            vscode.window.showInformationMessage(vscode.l10n.t('Library installation complete.'));
        }

    } catch (err) {
        console.error('Failed to parse arduino.json or install dependencies', err);
    }
}
