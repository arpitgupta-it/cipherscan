import * as vscode from 'vscode';

const config = vscode.workspace.getConfiguration('cipherscan');

// Fetch the custom user patterns from the configuration
const userPatterns = config.get<{ name: string, regex: string }[]>('customPatterns') || [];

// Comprehensive secret patterns with refinements
export const secretPatterns = [
    { name: "Cloudinary", regex: /cloudinary:\/\/.*/ },
    { name: "Firebase URL", regex: /.*firebaseio\.com/ },
    { name: "Slack Token", regex: /(xox[p|b|o|a]-[0-9]{12}-[0-9]{12}-[0-9]{12}-[a-z0-9]{32})/ },
    { name: "RSA Private Key", regex: /-----BEGIN RSA PRIVATE KEY-----/ },
    { name: "OpenSSH Private Key", regex: /-----BEGIN OPENSSH PRIVATE KEY-----/ },
    { name: "SSH (DSA) Private Key", regex: /-----BEGIN DSA PRIVATE KEY-----/ },
    { name: "SSH (EC) Private Key", regex: /-----BEGIN EC PRIVATE KEY-----/ },
    { name: "PGP Private Key Block", regex: /-----BEGIN PGP PRIVATE KEY BLOCK-----/ },
    { name: "Amazon AWS Access Key ID", regex: /AKIA[0-9A-Z]{16}/ },
    { name: "Amazon MWS Auth Token", regex: /amzn\.mws\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/ },
    { name: "AWS API Key", regex: /AKIA[0-9A-Z]{16}/ },
    { name: "Facebook Access Token", regex: /EAACEdEose0cBA[0-9A-Za-z]+/ },
    { name: "Facebook OAuth", regex: /[f|F][a|A][c|C][e|E][b|B][o|O][o|O][k|K].*['|\"][0-9a-f]{32}['|\"]/ },
    { name: "GitHub Token", regex: /^(gh[psr]_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}|[g|G][i|I][t|T][h|H][u|U][b|B].*['|\"][0-9a-zA-Z]{35,40}['|\"])$/ },
    { name: "Generic API Key", regex: /[a|A][p|P][i|I][_]?[k|K][e|E][y|Y].*['|\"][0-9a-zA-Z]{32,45}['|\"]/ },
    { name: "Generic Secret", regex: /[s|S][e|E][c|C][r|R][e|E][t|T].*['|\"][0-9a-zA-Z]{32,45}['|\"]/ },
    { name: "Google API Key", regex: /AIza[0-9A-Za-z\\-_]{35}/ },
    { name: "Google Cloud Platform API Key", regex: /AIza[0-9A-Za-z\\-_]{35}/ },
    { name: "Google Cloud Platform OAuth", regex: /[0-9]+-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com/ },
    { name: "Google Drive API Key", regex: /AIza[0-9A-Za-z\\-_]{35}/ },
    { name: "Google Drive OAuth", regex: /[0-9]+-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com/ },
    { name: "Google (GCP) Service-account", regex: /\"type\": \"service_account\"/ },
    { name: "Google Gmail API Key", regex: /AIza[0-9A-Za-z\\-_]{35}/ },
    { name: "Google Gmail OAuth", regex: /[0-9]+-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com/ },
    { name: "Google OAuth Access Token", regex: /ya29\.[0-9A-Za-z\\-_]+/ },
    { name: "Google YouTube API Key", regex: /AIza[0-9A-Za-z\\-_]{35}/ },
    { name: "Google YouTube OAuth", regex: /[0-9]+-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com/ },
    { name: "Heroku API Key", regex: /[h|H][e|E][r|R][o|O][k|K][u|U].*[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/ },
    { name: "MailChimp API Key", regex: /[0-9a-f]{32}-us[0-9]{1,2}/ },
    { name: "Mailgun API Key", regex: /key-[0-9a-zA-Z]{32}/ },
    { name: "Password in URL", regex: /[a-zA-Z]{3,10}:\/\/[^\/\s:@]{3,20}:[^\/\s:@]{3,20}@.{1,100}[\"'\s]/ },
    { name: "PayPal Braintree Access Token", regex: /access_token\$production\$[0-9a-z]{16}\$[0-9a-f]{32}/ },
    { name: "Picatic API Key", regex: /sk_live_[0-9a-z]{32}/ },
    { name: "Slack Webhook", regex: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]{8}\/B[a-zA-Z0-9_]{8}\/[a-zA-Z0-9_]{24}/ },
    { name: "Stripe API Key", regex: /sk_live_[0-9a-zA-Z]{24}/ },
    { name: "Stripe Restricted API Key", regex: /rk_live_[0-9a-zA-Z]{24}/ },
    { name: "Square Access Token", regex: /sq0atp-[0-9A-Za-z\\-_]{22}/ },
    { name: "Square OAuth Secret", regex: /sq0csp-[0-9A-Za-z\\-_]{43}/ },
    { name: "Twilio API Key", regex: /SK[0-9a-fA-F]{32}/ },
    { name: "Twitter Access Token", regex: /[t|T][w|W][i|I][t|T][t|T][e|E][r|R].*[1-9][0-9]+-[0-9a-zA-Z]{40}/ },
    { name: "Twitter OAuth", regex: /[t|T][w|W][i|I][t|T][t|T][e|E][r|R].*['|\"][0-9a-zA-Z]{35,44}['|\"]/ },

    // Dynamically loaded user-defined patterns
    ...userPatterns.map(p => ({
        name: p.name,
        regex: new RegExp(p.regex) // Convert the regex string to a RegExp object
    }))
];
