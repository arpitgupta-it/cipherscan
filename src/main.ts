import { initializeStatusBar, disposeStatusBar } from './utils/statusBarUtils';
import { scanLocation } from './detectors/secretDetector';
import { logMessage } from './utils/loggingUtils';
import { watchGitCommit, checkAndAddToGitIgnore } from './utils/gitUtils';
import { executeScan } from './utils/scanUtils';
import * as vscode from 'vscode';

/**
 * Activates the CipherScan extension.
 * This function is called when the extension is activated by the user.
 * It initializes necessary features such as Git commit watcher, status bar, and configuration watchers.
 * 
 * @param context - The extension context, used for managing subscriptions and extension lifecycle.
 */
export function activate(context: vscode.ExtensionContext) {
    logMessage('CipherScan extension activated.', 'debug');

    // Set up Git commit watcher to prompt for secret scans whenever a commit is made
    watchGitCommit(context);

    // Initialize the status bar with the scan action button
    initializeStatusBar(context);

    // Watch for changes in the configuration related to Git ignore behavior
    vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('cipherscan.addToGitIgnore')) {
            // Automatically add '.cipherscan' folder to .gitignore if the configuration allows it
            checkAndAddToGitIgnore();
        }
    });

    // Register a command that starts the scan, either for the entire workspace or a specific folder
    const scanCommand = vscode.commands.registerCommand('cipherscan.startScan', async () => {
        await executeScan(scanLocation, context);  // Execute the scan function with the provided context
    });

    // Add the scan command to the list of disposables to ensure proper cleanup
    context.subscriptions.push(scanCommand);
}

/**
 * Deactivates the CipherScan extension.
 * Cleans up resources and disposes of items like the status bar when the extension is deactivated.
 */
export function deactivate() {
    logMessage('CipherScan extension deactivated.', 'debug');

    // Dispose the status bar item to free up resources and prevent memory leaks
    disposeStatusBar();
}