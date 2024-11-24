# CipherScan for VSCode

**CipherScan** is a Visual Studio Code extension that scans your project for sensitive information such as API keys, passwords, tokens, and more. With just a few clicks, you can scan your entire workspace for potential secrets and ensure your codebase remains secure.

###

## 🚀 Features

- **Manual Scanning**: Scan your entire workspace for sensitive information with a simple click on the **status bar button**.
- **Custom Pattern Support**: Define your own custom regex patterns to search for a wide range of secrets (e.g., GitHub tokens, AWS keys, etc.).
- **Detailed Logs**: All scan results are logged in a `secrets.log` file located in the `.cipherscan` folder at the root of your workspace.
- **Real-Time Information**: Get detailed logs including timestamps, the number of files scanned, and whether secrets were detected.
- **No Auto-Scanning**: Scans are manually triggered, giving you control over when to check for exposed secrets.

###

## 🛠️ Installation & Setup

1. **Install the Extension**:
   - Open **VSCode** and go to the Extensions Marketplace.
   - Search for **CipherScan**, then click **Install**.

2. **Scan Your Workspace**:
   - After installation, find the **status bar button** at the bottom of the VSCode window.
   - Click the button to start scanning your workspace for exposed secrets.

3. **View Scan Results**:
   - After the scan completes, check the `.cipherscan/secrets.log` file in your workspace root.
   - The log will show detailed information like:
     - Scan start time
     - Number of files scanned
     - Whether secrets were detected

###

## 🔧 Configuration

### Custom Patterns

To detect custom secrets, you can configure your own regex patterns. Add these patterns in your workspace settings:

```json
"cipherscan.customPatterns": [
    {
        "name": "GitHub Token",
        "regex": "\\bgho_[0-9a-zA-Z]{36}\\b"
    },
    {
        "name": "AWS Access Key",
        "regex": "AKIA[0-9A-Z]{16}"
    }
]
```
- **name:** The name you want to give to the pattern (e.g., "GitHub Token").
- **regex:** The regex pattern used to match the secret you want to detect.

You can add as many custom patterns as needed to suit your project’s requirements.

### 

# 📝 Log Example

When you run a scan, detailed logs are generated in the `.cipherscan/secrets.log` file to track the scanning process and the results. Below is an example of a log entry:

```
[2024-11-24T11:35:24.402Z] [DEBUG] CipherScan extension activated.
[2024-11-24T11:35:25.701Z] [INFO] --------------------------------- Scan started ---------------------------------
[2024-11-24T11:35:25.767Z] [INFO] Found 1 files to scan.
[2024-11-24T11:35:25.772Z] [INFO] --------------------- Scan completed: No secrets detected. ---------------------
[2024-11-24T11:35:39.636Z] [DEBUG] CipherScan extension deactivated.
```

- **Scan started**: Timestamp when the scan started.
- **Found X files to scan**: The number of files found and scanned in the workspace.
- **Scan completed**: The result of the scan (whether secrets were detected or not).

###

## ⚠️ Disclaimer

**CipherScan** is designed to help detect secrets but it cannot guarantee complete coverage. Always use secure practices for handling sensitive information.

###

## 📄 License

This project is licensed under the Apache License, Version 2.0 - see the [LICENSE](LICENSE) file for details.