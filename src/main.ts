import { initializeStatusBar, disposeStatusBar } from './utils/statusBarUtils';
import { scanWorkspace } from './detectors/secretDetector';
import { logMessage, createSeparatorLogLine } from './utils/loggingUtils';
import { watchGitCommit, checkAndAddToGitIgnore } from './utils/gitUtils';
import * as vscode from 'vscode';

let isScanning = false;

/**
 * Activates the CipherScan extension.
 * Initializes the status bar, watches for Git commits, checks configuration settings, 
 * and registers the scan command.
 *
 * @param context - The extension context provided by VS Code.
 */
export function activate(context: vscode.ExtensionContext) {
    logMessage('CipherScan extension activated.', 'debug');

    // Set up Git commit watcher to prompt for secret scans
    watchGitCommit(context);

    // Initialize the status bar for the scan action
    initializeStatusBar(context);

    // Watch for configuration changes in 'cipherscan.addToGitIgnore'
    vscode.workspace.onDidChangeConfiguration((e) => {

        // Check if 'cipherscan.addToGitIgnore' setting was changed
        if (e.affectsConfiguration('cipherscan.addToGitIgnore')) {
            checkAndAddToGitIgnore();
        }
    });

    // Register the manual scan command
    const manualScanCommand = vscode.commands.registerCommand(
        'cipherscan.scanWorkspace',
        async () => {
            if (isScanning) {
                vscode.window.showInformationMessage('Scan already in progress. Please wait...');
                return;
            }

            isScanning = true;
            logMessage(createSeparatorLogLine('Scan started'), 'info');

            try {
                const hasSecrets = await scanWorkspace(context);
                const scanResultMessage = hasSecrets
                    ? 'Scan completed: Exposed secrets found.'
                    : 'Scan completed: No secrets detected.';

                logMessage(createSeparatorLogLine(scanResultMessage), 'info');
            } catch (error) {
                logMessage(`Error during scan: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
            } finally {
                isScanning = false;
            }
        }
    );

    // Add the command to the extension's subscriptions for proper cleanup
    context.subscriptions.push(manualScanCommand);
}

/**
 * Deactivates the CipherScan extension.
 * Cleans up resources like the status bar when the extension is deactivated.
 */
export function deactivate() {
    logMessage('CipherScan extension deactivated.', 'debug');
    disposeStatusBar();
}
