import * as vscode from 'vscode';
import * as fs from 'fs';
import { scanFileContent } from '../utils/fileUtils';
import { logMessage, getReportFilePath } from '../utils/loggingUtils'; // Assuming logging is done here
import { fileFormatsConfig } from './fileFormats'; // Importing from fileFormats.
import { generateReport } from '../utils/reportUtils';


// Helper function to handle errors
function handleError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    vscode.window.showErrorMessage(`Error while scanning workspace: ${errorMessage}`);
    logMessage(`Error during scan: ${errorMessage}`, 'error');
}

// Scan workspace for secrets
export async function scanWorkspace(context: vscode.ExtensionContext): Promise<boolean> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showInformationMessage('No workspace folder open to scan.');
        return false;
    }

    const secretsDetected = new Set<{ secret: string; lineNumber: number; patternName: string, filePath: string }>();

    try {
        // Use fileFormatsConfig directly from the imported fileFormats.ts
        const { include, exclude } = fileFormatsConfig;

        // Build the file pattern from the include list
        const includePattern = include.length > 0 ? `**/*.{${include.join(',')}}` : '**/*';

        // Build the exclude pattern from the exclude list
        const excludePattern = exclude.length > 0 ? `{${exclude.join(',')}}` : '';

        // Get all the files to scan based on the patterns
        const files = await vscode.workspace.findFiles(includePattern, excludePattern);

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

                        // Filter out any matches in comments or non-relevant sections
                        const filteredIssues = issues.filter(issue => !isInComment(content, issue.lineNumber));

                        filteredIssues.forEach(issue => {
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
        return handleDetectedSecrets(secretsDetected, totalFiles, context);
    } catch (error: unknown) {
        handleError(error);
        return false;
    }
}

// Helper function to check if a line is within a comment
function isInComment(content: string, lineNumber: number): boolean {
    const lines = content.split('\n');
    const line = lines[lineNumber - 1]; // Line numbers are 1-indexed
    return line.trim().startsWith('//') || line.trim().startsWith('#') || line.trim().startsWith('/*');
}

// Handle detected secrets
function handleDetectedSecrets(
    secretsDetected: Set<{ secret: string; lineNumber: number; patternName: string, filePath: string }>,
    totalFiles: number,
    context: vscode.ExtensionContext
): boolean {
    if (secretsDetected.size === 0) {
        vscode.window.showInformationMessage('No secrets detected in the workspace.');
        return false;
    }

    // Log secrets using the existing logging utility
    secretsDetected.forEach(secret => {
        logMessage(
            `Secret detected: ${secret.patternName} at line ${secret.lineNumber} in ${secret.filePath}`,
            'warning'
        );
    });

    try {
        const reportPath = getReportFilePath('exposed-secrets'); // Use a consistent report name
        generateReport(Array.from(secretsDetected), reportPath, totalFiles, context);

        vscode.window.showInformationMessage(`Secrets report generated at: ${reportPath}`);
    } catch (error) {
        logMessage(`Error generating report: ${error}`, 'error');
    }

    return true;
}
