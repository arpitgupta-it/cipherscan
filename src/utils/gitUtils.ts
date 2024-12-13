import * as vscode from 'vscode';
import * as fs from 'fs';
import path from 'path';
import { getConfig } from '../constants/config';
import { logMessage } from './loggingUtils';

const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

/**
 * Prompts the user to run a secret scan before pushing committed changes.
 * If the user selects 'Yes', the scan is triggered via a VS Code command.
 * 
 * @param context - The VS Code extension context used for executing the scan.
 */
function promptForSecretScan(context: vscode.ExtensionContext): void {
    vscode.window
        .showInformationMessage(
            'You have committed changes. Would you like to run a scan for secrets before pushing?',
            'Yes',
            'No'
        )
        .then((selection) => {
            if (selection === 'Yes') {
                vscode.commands.executeCommand('cipherscan.startScan', context);
            }
        });
}

/**
 * Watches the `.git/logs/HEAD` file for commit events and prompts the user to scan for secrets.
 * Registers a file system watcher to detect changes to the commit log and triggers the scan prompt.
 * 
 * @param context - The VS Code extension context for managing subscriptions.
 */
export function watchGitCommit(context: vscode.ExtensionContext): void {
    if (!workspaceRoot) return; // Exit if no workspace is open

    const gitLogsPath = path.join(workspaceRoot, '.git', 'logs', 'HEAD');

    try {
        const gitWatcher = vscode.workspace.createFileSystemWatcher(gitLogsPath);
        gitWatcher.onDidChange(() => promptForSecretScan(context)); // Trigger scan prompt on commit
        context.subscriptions.push(gitWatcher); // Ensure watcher is disposed properly
    } catch (error) {
        vscode.window.showErrorMessage('Error initializing Git commit watcher.');
    }
}

/**
 * Ensures the `.cipherscan` folder is added to `.gitignore` to prevent Git from tracking scan reports.
 * Prompts the user before modifying the `.gitignore` file and appends `.cipherscan` if it’s not already listed.
 */
export async function addToGitIgnore(): Promise<void> {
    const config = getConfig(); // Fetch the latest configuration
    const gitIgnoreBoolean = config.get<boolean>('addToGitIgnore', true); // Default to true

    if (!gitIgnoreBoolean || !workspaceRoot) return; // Exit if setting is disabled or no workspace

    const gitFolderPath = path.join(workspaceRoot, '.git');
    const gitignorePath = path.join(workspaceRoot, '.gitignore');

    try {
        if (!fs.statSync(gitFolderPath).isDirectory()) return; // Ensure .git directory exists

        let gitignoreContent = '';
        try {
            gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8'); // Read existing .gitignore
        } catch {
            fs.writeFileSync(gitignorePath, ''); // Create .gitignore if it doesn't exist
        }

        // Only show prompt if '.cipherscan' is not already in .gitignore
        if (!gitignoreContent.includes('.cipherscan')) {
            const response = await vscode.window.showInformationMessage(
                'The .cipherscan folder stores scan reports. Add it to .gitignore to avoid Git tracking?',
                'Yes',
                'No'
            );

            if (response === 'Yes') {
                fs.appendFileSync(gitignorePath, '\n.cipherscan\n');
                vscode.window.showInformationMessage('.cipherscan folder added to .gitignore.');
            } else {
                vscode.window.showInformationMessage('.cipherscan folder was not added to .gitignore.');
            }
        }
    } catch (error) {
// If an error occurs while checking the Git folder or modifying .gitignore, add to log file
        logMessage('Failed to locate .git folder or modify .gitignore.', 'info');
    }
}

/**
 * Checks the `cipherscan.addToGitIgnore` setting and calls `addToGitIgnore` if enabled.
 */
export function checkAndAddToGitIgnore(): void {
    const config = getConfig();
    const gitIgnoreBoolean = config.get<boolean>('addToGitIgnore', true);

    if (gitIgnoreBoolean) {
        addToGitIgnore(); // Add .cipherscan to .gitignore if setting is enabled
    }
}
