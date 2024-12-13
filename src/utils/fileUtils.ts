import * as fs from 'fs';
import * as path from 'path';
import * as fse from 'fs-extra';
import * as crypto from 'crypto';
import { workspace } from 'vscode';
import { MAX_LOG_CACHE } from '../constants/default';

const recentLogHashes: Set<string> = new Set();

/**
 * Retrieves the full path of a file in the workspace's `.cipherscan` directory, creating the directory if necessary.
 * 
 * @param fileName - The name of the file (without extension).
 * @param extension - The file extension (e.g., 'txt', 'json').
 * @returns The full path of the file, or an empty string if the workspace is not found.
 */
export function getFilePath(fileName: string, extension: string): string {
    const workspaceFolder = workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
        console.error('No workspace folder found.');
        return '';  // Return empty string if workspace folder is not found
    }

    const dir = path.join(workspaceFolder, '.cipherscan');
    const filePath = path.join(dir, `${fileName}.${extension}`);

    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    return filePath;
}

/**
 * Generates a SHA-256 hash for the provided message.
 * 
 * @param message - The input string to hash.
 * @returns The resulting SHA-256 hash as a hexadecimal string.
 */
export function createHash(message: string): string {
    return crypto.createHash('sha256').update(message).digest('hex');
}

/**
 * Checks if the given message is a duplicate by comparing its hash against previously processed messages.
 * 
 * @param message - The message to check for duplication.
 * @returns `true` if the message is a duplicate, otherwise `false`.
 */
export function isDuplicate(message: string): boolean {
    const messageHash = createHash(message);

    // Check if the message hash is already in the recent log cache
    if (recentLogHashes.has(messageHash)) return true;

    recentLogHashes.add(messageHash);

    // Remove the oldest hash if the cache exceeds the maximum allowed size
    if (recentLogHashes.size > MAX_LOG_CACHE) {
        const iterator = recentLogHashes.values();
        const value = iterator.next().value;

        if (value !== undefined) {
            recentLogHashes.delete(value);  // Delete the oldest entry if defined
        }
    }

    return false;
}

/**
 * Ensures exclusive access to a log file by using a lock file. The callback is executed once the lock is acquired.
 * 
 * @param logFilePath - The path to the log file.
 * @param callback - The function to execute while holding the lock.
 */
export function withFileLock(logFilePath: string, callback: () => void): void {
    const lockFilePath = `${logFilePath}.lock`;

    let lockAcquired = false;
    while (!lockAcquired) {
        try {
            // Attempt to create the lock file if it doesn't already exist
            if (!fs.existsSync(lockFilePath)) {
                fse.ensureFileSync(lockFilePath);  // Ensure the lock file exists
                lockAcquired = true;
            }
        } catch (err) {
            console.error('Error checking or creating lock file:', err);
        }
    }

    try {
        callback();  // Execute the callback while holding the lock
    } catch (err) {
        console.error('Error executing callback:', err);
    } finally {
        try {
            fse.removeSync(lockFilePath);  // Remove the lock file after callback execution
        } catch (err) {
            console.error('Error removing lock file:', err);
        }
    }
}

