import * as vscode from 'vscode';
import { scanWorkspace } from './detectors/secretDetector';
import { logMessage, createSeparatorLogLine } from './utils/loggingUtils';

let isScanning = false;  // To prevent concurrent scans
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    console.log('CipherScan extension activated.');

    // Log the activation of the extension (debug level)
    logMessage('CipherScan extension activated.', 'debug');

    // Create and register the status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10);
    statusBarItem.text = '$(search) Find Exposed Secrets';
    statusBarItem.command = 'cipherscan.scanWorkspace';
    statusBarItem.tooltip = 'Click to start scanning for exposed secrets';
    statusBarItem.show();

    // Register the manual scan command
    const manualScanCommand = vscode.commands.registerCommand('cipherscan.scanWorkspace', async () => {
        if (isScanning) {
            vscode.window.showInformationMessage('Scan is already in progress. Please wait...');
            return;
        }

        isScanning = true;

        // Log the start of the scan with a separator
        logMessage(createSeparatorLogLine('Scan started'), 'info');

        try {
            const hasSecrets = await scanWorkspace(context);

            // Log scan completion message with a separator
            const scanResultMessage = !hasSecrets
                ? 'Scan completed: No secrets detected.'
                : 'Scan completed: Exposed secrets found.';

            logMessage(createSeparatorLogLine(scanResultMessage), 'info');
        } catch (error) {
            if (error instanceof Error) {
                logMessage(`Error during scan: ${error.message}`, 'error'); // Log errors during the scan
            }
        } finally {
            isScanning = false; // Ensure this is set to false when scan completes or fails
        }
    });

    context.subscriptions.push(manualScanCommand, statusBarItem);
}

export function deactivate() {
    console.log('CipherScan extension deactivated.');

    // Log the deactivation
    logMessage('CipherScan extension deactivated.', 'debug');

    if (statusBarItem) {
        statusBarItem.dispose();
    }
}
