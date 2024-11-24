import * as vscode from 'vscode';
const config = vscode.workspace.getConfiguration('cipherscan');

// Fetch the custom user patterns from the configuration
const userPatterns = config.get<{ name: string, regex: string }[]>('customPatterns') || [];

// More comprehensive secret patterns with additional refinements
export const secretPatterns = [
    { name: 'GitHub Token', regex: /\bgho_[0-9a-zA-Z]{36}\b/ },
    { name: 'API Key', regex: /\bAPI_KEY_[A-Za-z0-9]{32}\b/ },
    { name: 'AWS Access Key', regex: /\bAKIA[0-9A-Z]{16}\b/ },
    { name: 'AWS Secret Key', regex: /\b[A-Za-z0-9/+=]{40}\b(?![\s\S]*-----BEGIN)/ },
    { name: 'Google API Key', regex: /\bAIza[0-9A-Za-z-_]{35}\b/ },
    { name: 'JWT Token', regex: /\beyJ[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]*\b/ },
    { name: 'Stripe Secret Key', regex: /\bsk_live_[0-9a-zA-Z]{24}\b/ },
    { name: 'Slack Token', regex: /\bxox[abp]-[0-9A-Za-z]{10,48}\b/ },
    { name: 'Password-like String', regex: /\b(password|passwd|pwd|secret|key|token)\s*[:=]\s*["']?.+["']?/i },
    { name: 'Private Key', regex: /-----BEGIN (RSA|DSA|EC|PGP|PRIVATE) KEY-----[\s\S]+?-----END (RSA|DSA|EC|PGP|PRIVATE) KEY-----/ },
    { name: 'Firebase Database Secret', regex: /\bAIza[0-9A-Za-z-_]{35}\b/ },
    { name: 'OAuth Token', regex: /\b[a-zA-Z0-9\-_]{36,48}\b/ },
    { name: 'DigitalOcean API Key', regex: /\bdo_api_[0-9a-f]{64}\b/ },
    { name: 'Twilio API Key', regex: /\bSK[0-9a-fA-F]{32}\b/ },
    { name: 'Mailgun API Key', regex: /\bkey-[0-9a-zA-Z]{32}\b/ },
    { name: 'MongoDB URI', regex: /mongodb(?:\+srv)?:\/\/(?:[a-zA-Z0-9]+(?::[a-zA-Z0-9]+)?@)?[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(:\d+)?(?:\/[a-zA-Z0-9-]+)?/ },
    { name: 'OAuth Token (General)', regex: /\b[a-zA-Z0-9\-_]{36,48}\b/ },

    // Dynamically loaded user-defined patterns
    ...userPatterns.map(p => ({
        name: p.name,
        regex: new RegExp(p.regex)  // Convert the regex string to a RegExp object
    }))
];
