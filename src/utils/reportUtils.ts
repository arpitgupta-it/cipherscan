import * as fs from 'fs';
import * as path from 'path';
import { ExtensionContext } from 'vscode';
import { getPartialSecret } from './loggingUtils';

// Centralized function to get severity, risk score, and color
const getSeverityDetails = (secret: string) => {
    const severity = secret.length > 50 ? 'High' : 'Medium'; // Adjust logic as needed
    const riskScore = secret.length * 2; // Adjust logic as needed
    return {
        severity,
        riskScore,
        color: severity === 'High' ? 'red' : severity === 'Medium' ? 'orange' : 'green'
    };
};

export function generateReport(
    secrets: { secret: string, lineNumber: number, patternName: string, filePath: string }[],
    reportPath: string,
    totalFilesScanned: number,
    context: ExtensionContext
): void {
    if (secrets.length === 0) {
        console.log('No secrets detected, skipping report generation.');
        return;
    }

    // Resolve the absolute path to the logo
    const logoPath = context.asAbsolutePath('img/icon512.png');

    // Group secrets by file, enrich them with severity and risk score
    const secretsByFile = secrets.reduce((acc, secret) => {
        const { severity, riskScore } = getSeverityDetails(secret.secret); // Get details
        const enrichedSecret = {
            ...secret,   // Keep all original properties, including filePath
            severity,
            riskScore
        };

        if (!acc[secret.filePath]) acc[secret.filePath] = [];
        acc[secret.filePath].push(enrichedSecret);

        return acc;
    }, {} as Record<string, { secret: string; lineNumber: number; patternName: string; filePath: string; severity: string; riskScore: number }[]>);

    // Generate file summaries and details with risk scores and severity
    const generateFileSummary = (secrets: { secret: string, lineNumber: number, patternName: string, filePath: string, severity: string }[]) => {
        const severityCounts = { High: 0, Medium: 0, Low: 0 };
        secrets.forEach(secret => {
            severityCounts[secret.severity as keyof typeof severityCounts]++;
        });

        return `
        <tr>
            <td><a href="file://${secrets[0].filePath}" target="_blank">${secrets[0].filePath}</a></td>
            <td>${secrets.length}</td>
            <td>${severityCounts['High']}</td>
            <td>${severityCounts['Medium']}</td>
            <td>${severityCounts['Low']}</td>
        </tr>
        `;
    };

    const generateFileDetails = (secrets: { secret: string, lineNumber: number, patternName: string, filePath: string, severity: string, riskScore: number }[]) => {
        return secrets.map(secret => {
            const { color } = getSeverityDetails(secret.secret);
            return `
            <tr>
                <td>${secret.lineNumber}</td>
                <td>${secret.patternName}</td>
                <td>${getPartialSecret(secret.secret)}</td>
                <td style="color:${color}">${secret.severity}</td>
                <td>${secret.riskScore}</td>
            </tr>
            `;
        }).join('');
    };

    const fileSummaries = Object.entries(secretsByFile)
        .map(([_, fileSecrets]) => generateFileSummary(fileSecrets))
        .join('');

    const fileDetails = Object.entries(secretsByFile)
        .map(([_, fileSecrets]) => {
            return `
            <div class="file-section">
                <h3>Secrets in: <a href="file://${fileSecrets[0].filePath}" target="_blank">${fileSecrets[0].filePath}</a></h3>
                <table>
                    <thead>
                        <tr>
                            <th>Line Number</th>
                            <th>Pattern</th>
                            <th>Partial Secret</th>
                            <th>Severity</th>
                            <th>Risk Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${generateFileDetails(fileSecrets)}
                    </tbody>
                </table>
            </div>
            `;
        })
        .join('');

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
                .boxed-section { margin-top: 20px; padding: 20px; background: #fff; border: 1px solid #ddd; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); border-radius: 8px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                th { background-color: #f2f2f2; color: #333; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                tr:hover { background-color: #f1f1f1; }
                footer { text-align: center; padding: 10px; background-color: #f2f2f2; color: #666; margin-top: 20px; }
                h2 { color: #0047ab; margin-top: 30px; }
                .file-section { margin-top: 20px; padding: 15px; background: #fff; border: 1px solid #ddd; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); border-radius: 8px; }
                .file-section h3 { margin: 0 0 10px 0; font-size: 20px; }
                p { margin: 0; padding: 5px 0; }
                .separator { border: 0; height: 1px; background-color: #0047ab; margin: 30px 0; }
            </style>
        </head>
        <body>
            <header>
                <img src="file://${logoPath}" alt="CipherScan Logo">
                <h1>CipherScan Secrets Report</h1>
            </header>
            <main>
                <div class="boxed-section">
                    <h2>Scan Overview</h2>
                    <p>Total Files Scanned: ${totalFilesScanned}</p>
                    <p>Total Secrets Found: ${secrets.length}</p>
                    <table>
                        <thead>
                            <tr>
                                <th>File Path</th>
                                <th>Total Secrets</th>
                                <th>High Severity</th>
                                <th>Medium Severity</th>
                                <th>Low Severity</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${fileSummaries}
                        </tbody>
                    </table>
                </div>
        
                <!-- Exposed Secrets Details Section (Now Boxed) -->
                <div class="boxed-section">
                <h2>Exposed Secrets Details</h2>
                    ${fileDetails}
                </div>
            </main>
            <footer>
                <p>&copy; 2024 CipherScan. All rights reserved.</p>
            </footer>
        </body>
        </html>
        `;

    fs.writeFileSync(reportPath, htmlContent);
    console.log(`Report generated at: ${reportPath}`);
}
