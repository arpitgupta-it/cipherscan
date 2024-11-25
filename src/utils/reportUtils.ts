import * as fs from 'fs';
import * as path from 'path';
import { ExtensionContext } from 'vscode';
import { getPartialSecret } from './loggingUtils';

export function generateReport(
    secrets: { secret: string, lineNumber: number, patternName: string, filePath: string }[],
    reportPath: string,
    context: ExtensionContext
): void {
    if (secrets.length === 0) {
        console.log('No secrets detected, skipping report generation.');
        return;
    }

    // Resolve the absolute path to the logo
    const logoPath = context.asAbsolutePath('img/icon512.png');

    const rows = secrets.map(secretInfo => `
        <tr>
            <td>${secretInfo.filePath}</td>
            <td>${secretInfo.lineNumber}</td>
            <td>${secretInfo.patternName}</td>
            <td>${getPartialSecret(secretInfo.secret)}</td>
        </tr>
    `).join('');

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>CipherScan Secrets Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9; color: #333; }
                header { background-color: #0047ab; color: white; padding: 20px; text-align: center; }
                header img { max-height: 50px; vertical-align: middle; margin-right: 10px; }
                header h1 { display: inline-block; font-size: 24px; margin: 0; vertical-align: middle; }
                main { padding: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                th { background-color: #f2f2f2; color: #333; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                tr:hover { background-color: #f1f1f1; }
                footer { text-align: center; padding: 10px; background-color: #f2f2f2; color: #666; margin-top: 20px; }
            </style>
        </head>
        <body>
            <header>
                <img src="file://${logoPath}" alt="CipherScan Logo">
                <h1>CipherScan Secrets Report</h1>
            </header>
            <main>
                <table>
                    <thead>
                        <tr>
                            <th>File Path</th>
                            <th>Line Number</th>
                            <th>Pattern</th>
                            <th>Partial Secret</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </main>
            <footer>
                &copy; ${new Date().getFullYear()} CipherScan. All Rights Reserved.
            </footer>
        </body>
        </html>
    `;

    // Ensure the directory exists
    const dir = path.dirname(reportPath);
    fs.mkdirSync(dir, { recursive: true });

    // Write the HTML content to the file
    fs.writeFileSync(reportPath, htmlContent, 'utf-8');
    console.log(`Report saved to: ${reportPath}`);
}
