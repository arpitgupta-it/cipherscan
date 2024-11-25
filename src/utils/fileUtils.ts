import { secretPatterns } from '../detectors/secretPatterns';

// Helper function to check if a line is within a comment or string
function isInCommentOrString(content: string, lineNumber: number): boolean {
    const lines = content.split('\n');
    const line = lines[lineNumber - 1]; // 1-indexed line number
    return line.trim().startsWith('//') || line.trim().startsWith('#') || line.includes('/*') || line.includes('*/') || line.includes('"""') || line.includes("'''");
}

// Function to scan the content of a file
export async function scanFileContent(content: string, filePath: string): Promise<{ secret: string, lineNumber: number, patternName: string, filePath: string }[]> {
    const detectedSecrets: { secret: string, lineNumber: number, patternName: string, filePath: string }[] = [];
    const lines = content.split('\n');
    const uniqueSecrets = new Set<string>();  // To track unique secrets per line

    // Scan content with both default and custom patterns from secretPatterns
    for (const pattern of secretPatterns) {
        // Iterate through each line to check for matches
        lines.forEach((line, index) => {
            if (isInCommentOrString(content, index + 1)) {
                // Skip this line if it's in a comment or string
                return;
            }

            try {
                const matches = line.match(pattern.regex);
                if (matches) {
                    matches.forEach(match => {
                        // Only capture matches that are potentially secrets, not trivial matches
                        if (match.length > 5) { // Example length check to filter out trivial matches
                            const uniqueKey = `${match}_${index + 1}`;
                            if (!uniqueSecrets.has(uniqueKey)) {
                                uniqueSecrets.add(uniqueKey);

                                // Extracting the secret part (if present)
                                const secret = match.split(/[=:]/)[1]?.trim() || match.trim();
                                if (secret) {
                                    detectedSecrets.push({
                                        secret,
                                        lineNumber: index + 1,
                                        patternName: pattern.name,
                                        filePath: filePath
                                    });
                                }
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

