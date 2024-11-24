import * as fs from 'fs';
import * as path from 'path';
import { workspace } from 'vscode';
import * as crypto from 'crypto';
import * as fse from 'fs-extra'; // To use file locking with a manual lock file

// Cache for recent log entries' hashes (to avoid duplicates)
const recentLogHashes: Set<string> = new Set();
const MAX_LOG_CACHE = 100; // Store the last N log entries for duplication check

/**
 * Helper function to get the partial secret (first 6 and last 4 characters)
 * @param secret The secret string to format.
 * @returns A string with the first 6 and last 4 characters of the secret.
 */
export function getPartialSecret(secret: string): string {
    return `${secret.slice(0, 6)}...${secret.slice(-4)}`;
}

/**
 * Get the log file path
 * @returns The log file path
 */
export function getLogFilePath(): string {
    const workspaceFolder = workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
        console.error('No workspace folder found.');
        return ''; // Ideally throw an error or return a default path
    }

    const logDir = path.join(workspaceFolder, '.cipherscan');
    const logFilePath = path.join(logDir, 'secrets.log');

    try {
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    } catch (err) {
        console.error('Error creating log directory:', err);
        throw new Error('Failed to create log directory');
    }

    return logFilePath;
}

/**
 * Create a hash for a log entry
 * @param message The log message to hash
 */
function createHash(message: string): string {
    return crypto.createHash('sha256').update(message).digest('hex');
}

/**
 * Check if the message is a duplicate by comparing against recent logs
 * @param message The log message
 */
function isDuplicate(message: string): boolean {
    const messageHash = createHash(message);
    if (recentLogHashes.has(messageHash)) return true;

    // Add the new hash and maintain the cache size
    recentLogHashes.add(messageHash);
    if (recentLogHashes.size > MAX_LOG_CACHE) {
        const iterator = recentLogHashes.values();
        recentLogHashes.delete(iterator.next().value); // Remove the oldest hash
    }
    return false;
}

/**
 * Function to handle file locking while writing logs
 * @param logFilePath The full path of the log file
 * @param callback The function to execute once the file is locked
 */
function withFileLock(logFilePath: string, callback: () => void): void {
    const lockFilePath = `${logFilePath}.lock`; // Lock file with a .lock extension

    // Wait for lock file to be removed (i.e., file is available)
    let lockAcquired = false;
    while (!lockAcquired) {
        try {
            if (!fs.existsSync(lockFilePath)) {
                fse.ensureFileSync(lockFilePath); // Create lock file
                lockAcquired = true; // Lock acquired
            }
        } catch (err) {
            console.error('Error checking or creating lock file:', err);
        }
    }

    try {
        callback(); // Execute the callback (writing the log)
    } catch (err) {
        console.error('Error executing callback:', err);
    } finally {
        try {
            fse.removeSync(lockFilePath); // Remove lock file after usage
        } catch (err) {
            console.error('Error removing lock file:', err);
        }
    }
}

/**
 * Log a message to the main log file (no separate verbose log file)
 * @param message The log message
 * @param level The log level (e.g., 'info', 'debug', 'error')
 */
export function logMessage(message: string | { secret: string, lineNumber: number }, level: string): void {
    const logFilePath = getLogFilePath();

    if (!logFilePath) return;

    // Format the message
    const formattedMessage = typeof message === 'object' && 'secret' in message && 'lineNumber' in message
        ? getPartialSecret(`Secret: ${message.secret}, Line: ${message.lineNumber}`)
        : message as string;

    const timestamp = new Date().toISOString();
    const finalMessage = `[${timestamp}] [${level.toUpperCase()}] ${formattedMessage}\n`;

    try {
        // Rotate log file if it exceeds the max size
        const maxLogSize = 1 * 1024 * 1024; // Max log file size (1MB)
        const stats = fs.existsSync(logFilePath) ? fs.statSync(logFilePath) : { size: 0 };
        if (stats.size > maxLogSize) {
            const timestamp = new Date().toISOString().replace(/:/g, '-');
            const archivedLogFilePath = path.join(path.dirname(logFilePath), `secrets-${timestamp}.log`);
            try {
                fs.renameSync(logFilePath, archivedLogFilePath); // Rotate the log file
                console.log(`Rotated log file: ${logFilePath}`);
            } catch (err) {
                console.error('Error rotating log file:', err);
            }
        }

        // Only append to the log file if it's not a duplicate
        if (!isDuplicate(finalMessage)) {
            withFileLock(logFilePath, () => {
                fs.appendFileSync(logFilePath, finalMessage);
            });
        }
    } catch (error) {
        console.error('Error handling log file:', error);
    }
}


/**
 * Creates a log separator line with a message centered between two sets of dashes.
 * @param message - The message to display in the separator line.
 * @param separatorLength - The total length of the separator line, including the message and the padding. Default is 80 characters.
 * @returns A string representing the separator line with the message centered.
 */
export function createSeparatorLogLine(message: string, separatorLength: number = 80): string {
    const messageLength = message.length;  // Calculate the length of the message
    const padding = separatorLength - messageLength - 2;  // Total padding available (subtracting 2 for space around the message)

    if (padding < 0) {
        // If the message is too long for the separator (i.e., it exceeds separatorLength), truncate the message
        return `${'-'.repeat(separatorLength)}`;  // Just return a line of dashes without the message
    }

    const leftPadding = Math.floor(padding / 2);  // Calculate left padding (half of the available padding)
    const rightPadding = padding - leftPadding;  // Calculate right padding (remaining space after left padding)

    // Return the separator line with message centered, surrounded by dashes
    return `${'-'.repeat(leftPadding)} ${message} ${'-'.repeat(rightPadding)}`;
}
