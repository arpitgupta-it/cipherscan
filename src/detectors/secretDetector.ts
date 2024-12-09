import * as vscode from 'vscode';
import * as fs from 'fs';
import { scanFileContent } from './secretScanner';
import { logMessage } from '../utils/loggingUtils';
import { getFilePath } from '../utils/fileUtils';
import { fileFormatsConfig } from './fileFormats';
import { generateReport } from '../reports/reportGenerator';
import { showDetectedSecretsInWebView } from '../utils/webviewUtils';
import { Secret, BASE64_ENTROPY_LIMIT } from '../constants/default';
import { filterHighEntropySecrets } from '../utils/entropyUtils';
import { secretPatterns } from './secretPatterns';

/**
 * Scans the entire workspace for secrets by scanning the files and filtering high entropy secrets.
 * The function also handles reporting, displaying detected secrets, and processing user interactions.
 * 
 * @param context - The VS Code extension context used for storing global state and other operations.
 * @returns Returns true if secrets are detected and processed successfully, false if no secrets are found or an error occurs.
 */
export async function scanWorkspace(context: vscode.ExtensionContext): Promise<boolean> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showInformationMessage('No workspace folder open to scan.');
        return false; // Return false if no workspace is open
    }

    const secretsDetected = new Set<{ secret: string; lineNumber: number; patternName: string; filePath: string }>();

    try {
        const { include, exclude } = fileFormatsConfig();
        const includePattern = getIncludeExcludePatterns(include, exclude);

        // Find all files in the workspace based on the include/exclude patterns
        const files = await vscode.workspace.findFiles(includePattern.includePattern, includePattern.excludePattern);
        logMessage(`Found ${files.length} files to scan.`, 'info');

        // Scan the files with progress reporting
        await scanFilesWithProgress(files, secretsDetected);

        // Filter secrets based on entropy to find high entropy secrets
        const highEntropySecrets = filterHighEntropySecrets(secretsDetected, BASE64_ENTROPY_LIMIT);

        // Handle the detected secrets (log, show in webview, generate report, etc.)
        return handleDetectedSecrets(highEntropySecrets, files.length, context);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        vscode.window.showErrorMessage(`Error while scanning workspace: ${errorMessage}`);
        logMessage(`Error during scan: ${errorMessage}`, 'error');
        return false; // Return false if an error occurs
    }
}

/**
 * Generates include and exclude patterns for file scanning based on the provided configuration.
 * 
 * @param include - Array of file formats to include in the scan (e.g., ['js', 'ts']).
 * @param exclude - Array of file formats to exclude from the scan (e.g., ['test', 'spec']).
 * @returns An object containing the generated include and exclude patterns for file scanning.
 */
function getIncludeExcludePatterns(include: string[], exclude: string[]) {
    const includePattern = include.length ? `**/*.{${include.join(',')}}` : '**/*';
    const excludePattern = exclude.length ? `{${exclude.join(',')}}` : '';
    return { includePattern, excludePattern };
}

/**
 * Scans a list of files for secrets while providing progress feedback to the user.
 * The files are read and processed to detect secrets, which are stored in the provided set.
 * 
 * @param files - Array of file URIs to scan for secrets.
 * @param secretsDetected - Set to accumulate detected secrets with their metadata (secret, line number, pattern name, file path).
 */
async function scanFilesWithProgress(
    files: vscode.Uri[],
    secretsDetected: Set<{ secret: string; lineNumber: number; patternName: string; filePath: string }>
) {
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Scanning for exposed secrets',
            cancellable: true,
        },
        async (progress, token) => {
            for (let i = 0; i < files.length; i++) {
                if (token.isCancellationRequested) {
                    progress.report({ message: 'Scan canceled.' });
                    return; // Exit early if scan is canceled
                }

                try {
                    const content = await fs.promises.readFile(files[i].fsPath, 'utf-8');
                    // Detect secrets in the file content
                    const issues = (await scanFileContent(content, files[i].fsPath));
                    issues.forEach(issue => secretsDetected.add(issue)); // Add detected secrets to the set
                } catch (Error) {
                    vscode.window.showErrorMessage(`Error reading file: ${files[i].fsPath}`);
                    logMessage(`Error while reading file: ${files[i].fsPath}`, 'error');
                }

                // Update progress
                progress.report({
                    increment: Math.floor(((i + 1) / files.length) * 100),
                    message: files[i].fsPath,
                });
            }
        }
    );
}

/**
 * Processes detected secrets by saving metadata, showing them in a WebView, and generating a report.
 * It also logs non-ignored secrets for further actions.
 * 
 * @param secretsDetected - Set of secrets that have been detected during the scan.
 * @param totalFiles - Total number of files scanned in the workspace.
 * @param context - The VS Code extension context used to store global state and handle interactions.
 * @returns Returns true if the detected secrets were processed successfully, false otherwise.
 */
async function handleDetectedSecrets(
    secretsDetected: Set<{ secret: string; lineNumber: number; patternName: string; filePath: string }>,
    totalFiles: number,
    context: vscode.ExtensionContext
): Promise<boolean> {
    if (!secretsDetected.size) {
        vscode.window.showInformationMessage('No secrets detected in the workspace.');
        return false; // Return false if no secrets are detected
    }

    // Convert the set of detected secrets to an array for easier processing
    const secretsArray = [...secretsDetected];

    // Step 1: Save the detected secrets metadata (excluding actual secret content) in global state
    const secretsMetadata = secretsArray.map(({ secret, ...rest }) => rest);  // Remove secret content
    context.globalState.update('currentSecrets', secretsMetadata);

    // Step 2: Show WebView with the detected secrets metadata for user review
    await context.globalState.update('ignoredSecrets', []);  // Clear any previously ignored secrets
    await showDetectedSecretsInWebView(secretsMetadata, context);  // Only show metadata (not secret content)

    // Step 3: After WebView interaction, filter out ignored secrets
    let ignoredSecrets: Secret[] = context.globalState.get('ignoredSecrets', []);
    const filteredSecrets = filterIgnoredSecrets(secretsMetadata, ignoredSecrets);

    // Step 4: Log the filtered secrets (now only the non-ignored ones, excluding the secret content)
    filteredSecrets.forEach(({ patternName, lineNumber, filePath }) =>
        logMessage(`Secret detected: ${patternName} at line ${lineNumber} in ${filePath}`, 'warning')
    );

    // Step 5: Generate a report with the filtered (non-ignored) secrets
    try {
        const reportFilePath = getFilePath('cipherscan-report', 'html');
        generateReport(filteredSecrets, reportFilePath, totalFiles, context, secretPatterns);
        vscode.window.showInformationMessage(`Secrets report generated at: ${reportFilePath}`);
    } catch (error) {
        logMessage(`Error generating report: ${error}`, 'error');
    }

    return true; // Return true if secrets were processed successfully
}

/**
 * Filters out secrets that have been ignored by the user based on their metadata.
 * 
 * @param secretsMetadata - The metadata of all detected secrets (excluding actual secret content).
 * @param ignoredSecrets - List of secrets that the user has chosen to ignore.
 * @returns A list of secrets that have not been ignored by the user.
 */
function filterIgnoredSecrets(secretsMetadata: Secret[], ignoredSecrets: Secret[]): Secret[] {
    return secretsMetadata.filter(secret =>
        !ignoredSecrets.some(ignored =>
            ignored.lineNumber === secret.lineNumber &&
            ignored.patternName === secret.patternName &&
            ignored.filePath === secret.filePath
        )
    );
}
