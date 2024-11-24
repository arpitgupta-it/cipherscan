import { secretPatterns } from '../detectors/secretPatterns';

// Function to scan the content of a file
export async function scanFileContent(content: string, filePath: string): Promise<{ secret: string, lineNumber: number, patternName: string, filePath: string }[]> {
    const detectedSecrets: { secret: string, lineNumber: number, patternName: string, filePath: string }[] = [];

    // Split the content into lines for line number tracking
    const lines = content.split('\n');

    // Track unique secrets by secret and line number
    const uniqueSecrets = new Set<string>();

    // Scan content with both default and custom patterns from secretPatterns
    for (const pattern of secretPatterns) {
        // Check each line for matching patterns
        lines.forEach((line, index) => {
            try {
                const matches = line.match(pattern.regex);
                if (matches) {
                    matches.forEach(match => {
                        // Only capture secrets after assignments (excluding variables like "password =")
                        if (match.includes('=') || match.includes(':')) {
                            const uniqueKey = `${match}_${index + 1}`;
                            if (!uniqueSecrets.has(uniqueKey)) {
                                uniqueSecrets.add(uniqueKey);
                                detectedSecrets.push({
                                    secret: match.split(/[=:]/)[1].trim(), // Capture the part after '=' or ':'
                                    lineNumber: index + 1,
                                    patternName: pattern.name,
                                    filePath: filePath
                                });
                            }
                        }
                    });
                }
            } catch (error: unknown) {
                // Handle errors silently, since error logging is done in `secretDetector.ts`
            }
        });
    }

    // Return all detected secrets with line numbers
    return detectedSecrets;
}