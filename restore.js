#!/usr/bin/env node
/**
 * Restores the original webview/index.js of the Claude Code extension.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const EXTENSION_DIR = path.join(os.homedir(), '.vscode', 'extensions');
const WEBVIEW_FILE = 'webview/index.js';

function findExtension() {
  const entries = fs.readdirSync(EXTENSION_DIR)
    .filter(d => d.startsWith('anthropic.claude-code-'))
    .sort()
    .reverse();

  if (entries.length === 0) {
    console.error('❌  Claude Code extension not found.');
    process.exit(1);
  }

  return path.join(EXTENSION_DIR, entries[0], WEBVIEW_FILE);
}

const webviewPath = findExtension();
const backupPath = webviewPath + '.claude-statusline-backup';

if (!fs.existsSync(backupPath)) {
  console.log('ℹ️   No backup found — extension is not patched.');
  process.exit(0);
}

fs.copyFileSync(backupPath, webviewPath);
fs.unlinkSync(backupPath);
console.log('✅  Extension restored to original.');
console.log('   → Reload VS Code: Ctrl+Shift+P → "Developer: Reload Window"');
