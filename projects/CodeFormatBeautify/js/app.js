// UI logic and utility functions

const extensionMap = {
  json: '.json',
  xml: '.xml',
  yaml: '.yaml',
  toml: '.toml',
  html: '.html',
  css: '.css',
  javascript: '.js',
  typescript: '.ts',
  python: '.py',
  java: '.java',
  c: '.c',
  go: '.go',
  rust: '.rs',
  php: '.php',
  ruby: '.rb',
  shell: '.sh',
  markdown: '.md',
  sql: '.sql',
  text: '.txt',
};

const reverseExtensionMap = {
  '.json': 'json',
  '.xml': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.py': 'python',
  '.java': 'java',
  '.c': 'c',
  '.cpp': 'c',
  '.h': 'c',
  '.hpp': 'c',
  '.go': 'go',
  '.rs': 'rust',
  '.php': 'php',
  '.rb': 'ruby',
  '.sh': 'shell',
  '.bash': 'shell',
  '.md': 'markdown',
  '.markdown': 'markdown',
  '.sql': 'sql',
  '.txt': 'text',
};

function getFileExtension(language) {
  return extensionMap[language] || '.txt';
}

function languageFromExtension(ext) {
  return reverseExtensionMap[ext] || 'text';
}

function getDownloadFilename(language) {
  return 'formatted' + getFileExtension(language);
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getFileExtension, languageFromExtension, getDownloadFilename };
}
