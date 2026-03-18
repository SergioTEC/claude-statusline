#!/usr/bin/env node
/**
 * claude-statusline installer
 * Installs the custom status line into Claude Code globally.
 * To undo: node uninstall.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const SETTINGS_FILE = path.join(CLAUDE_DIR, 'settings.json');
const SETTINGS_BACKUP = path.join(CLAUDE_DIR, 'settings.json.claude-statusline-backup');
const SCRIPT_DEST = path.join(CLAUDE_DIR, 'statusline.sh');
const SCRIPT_SRC = path.join(__dirname, '.claude', 'statusline.sh');
const FETCH_DEST = path.join(CLAUDE_DIR, 'fetch-usage.sh');
const FETCH_SRC = path.join(__dirname, '.claude', 'fetch-usage.sh');

// ─── Ensure ~/.claude exists ─────────────────────────────────────────────────
if (!fs.existsSync(CLAUDE_DIR)) {
  fs.mkdirSync(CLAUDE_DIR, { recursive: true });
}

// ─── Check if already installed ──────────────────────────────────────────────
if (fs.existsSync(SETTINGS_BACKUP)) {
  console.log('⚠️   claude-statusline is already installed.');
  console.log('    Run  node uninstall.js  to remove it before reinstalling.');
  process.exit(1);
}

// ─── Copy scripts ─────────────────────────────────────────────────────────────
fs.copyFileSync(SCRIPT_SRC, SCRIPT_DEST);
fs.chmodSync(SCRIPT_DEST, 0o755);
console.log(`✔  Script installed at: ${SCRIPT_DEST}`);

fs.copyFileSync(FETCH_SRC, FETCH_DEST);
fs.chmodSync(FETCH_DEST, 0o755);
console.log(`✔  Script installed at: ${FETCH_DEST}`);

// ─── Read existing settings.json (or start empty) ────────────────────────────
let settings = {};
if (fs.existsSync(SETTINGS_FILE)) {
  fs.copyFileSync(SETTINGS_FILE, SETTINGS_BACKUP);
  console.log(`✔  Backup created: ${SETTINGS_BACKUP}`);
  try {
    settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  } catch {
    console.error('❌  Existing settings.json is invalid (malformed JSON).');
    process.exit(1);
  }
} else {
  console.log('ℹ️   No settings.json found — a new one will be created.');
}

// ─── Inject statusLine ───────────────────────────────────────────────────────
settings.statusLine = {
  type: 'command',
  command: `bash ${SCRIPT_DEST}`
};

fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
console.log(`✔  statusLine added to: ${SETTINGS_FILE}`);

console.log('\n✅  Installation complete!');
console.log('   → Open any project in Claude Code and the status line will appear.');
console.log('   → To uninstall: node uninstall.js');
