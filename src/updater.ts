import * as vscode from 'vscode';
import { runCli } from './arduino-cli';
import * as statusBar from './status-bar';

/**
 * Update the index of available cores and libraries,
 * then upgrade any outdated cores and libraries.
 */
export async function updateAll() {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: vscode.l10n.t('Arduino: Updating cores and libraries...'),
        cancellable: false
    }, async (progress) => {
        try {
            // 1. Update Core Index
            progress.report({ increment: 10, message: vscode.l10n.t('Updating core index...') });
            await runCli(['core', 'update-index']);

            // 2. Upgrade Cores
            progress.report({ increment: 30, message: vscode.l10n.t('Upgrading cores...') });
            await runCli(['core', 'upgrade']);

            // 3. Upgrade Libraries
            progress.report({ increment: 30, message: vscode.l10n.t('Upgrading libraries...') });
            await runCli(['lib', 'upgrade']);

            progress.report({ increment: 30, message: vscode.l10n.t('Done.') });
            
            vscode.window.showInformationMessage(vscode.l10n.t('Arduino: Successfully updated all cores and libraries.'));
        } catch (e) {
            vscode.window.showErrorMessage(vscode.l10n.t('Arduino: Update failed. {0}', String(e)));
        }
    });
}
