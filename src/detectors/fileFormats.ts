export const fileFormatsConfig = {
    include: [
        "js", "ts", "jsx", "tsx", "py", "java", "rb", "php", "c", "cpp", "h", "cs", "go",
        "swift", "kt", "R", "scala", "sh", "bash", "json", "yml", "yaml", "toml", "xml", "ini",
        "properties", "env", "md", "rst", "log", "txt", "sql", "csv", "html", "bak", "swp", "tmp",
        "zip", "tar.gz", "tar", "rar", "Dockerfile", "gitlab-ci.yml", "circleci.yml", "tf"
    ],
    exclude: [
        "node_modules", "dist", ".git", "*.min.js", ".cipherscan"
    ]
};
