import * as vscode from 'vscode';
import * as fs from 'fs';
import { scanFileContent } from '../utils/fileUtils';
import { logMessage, getPartialSecret } from '../utils/loggingUtils';

// Handle the error outside the main function for better readability
function handleError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    vscode.window.showErrorMessage(`Error while scanning workspace: ${errorMessage}`);
    logMessage(`Error during scan: ${errorMessage}`, 'error');
}

export async function scanWorkspace(): Promise<boolean> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showInformationMessage('No workspace folder open to scan.');
        return false;
    }

    const secretsDetected = new Set<{ secret: string; lineNumber: number; patternName: string, filePath: string }>();

    try {
        const files = await vscode.workspace.findFiles(
            '**/*.{js,ts,py,java,json,env,txt,yml,yaml}',
            '{**/node_modules/**,**/dist/**,**/.git/**,**/*.min.js}'
        );

        // Log the number of files detected
        logMessage(`Found ${files.length} files to scan.`, 'info');

        // Unified scanning progress
        const totalFiles = files.length;

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Scanning for exposed secrets in:',
                cancellable: true
            },
            async (progress, token) => {
                for (let i = 0; i < totalFiles; i++) {
                    const file = files[i];

                    if (token.isCancellationRequested) {
                        progress.report({ increment: 0, message: 'Scan canceled.' });
                        return;
                    }

                    try {
                        const content = await fs.promises.readFile(file.fsPath, 'utf-8');
                        const issues = await scanFileContent(content, file.fsPath);

                        issues.forEach(issue => {
                            secretsDetected.add(issue); // Add each detected secret
                        });
                    } catch (err) {
                        vscode.window.showErrorMessage(`Error reading file: ${file.fsPath}`);
                    }

                    // Update progress percentage
                    const progressPercentage = Math.floor(((i + 1) / totalFiles) * 100);
                    progress.report({
                        increment: progressPercentage,
                        message: `${file.fsPath}`
                    });
                }
            }
        );

        // Handle and log detected secrets
        return handleDetectedSecrets(secretsDetected);
    } catch (error: unknown) {
        handleError(error);
        return false;
    }
}

function handleDetectedSecrets(
    secretsDetected: Set<{ secret: string; lineNumber: number; patternName: string, filePath: string }>
): boolean {
    if (secretsDetected.size === 0) {
        vscode.window.showInformationMessage('No secrets detected in the workspace.');
        return false;
    }

    // Log secrets using partial secret logic with filename
    secretsDetected.forEach(secret => {
        const partialSecret = getPartialSecret(secret.secret);
        const logEntry = `${partialSecret} found in ${secret.patternName} at line: ${secret.lineNumber} in file: ${secret.filePath}`;
        logMessage(logEntry, 'warning');
    });

    return true;
}