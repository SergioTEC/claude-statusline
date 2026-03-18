#!/usr/bin/env node
/**
 * claude-statusline uninstaller
 * Removes the status line and restores the original settings.json.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const SETTINGS_FILE = path.join(CLAUDE_DIR, 'settings.json');
const SETTINGS_BACKUP = path.join(CLAUDE_DIR, 'settings.json.claude-statusline-backup');
const SCRIPT_DEST = path.join(CLAUDE_DIR, 'statusline.sh');
const FETCH_DEST = path.join(CLAUDE_DIR, 'fetch-usage.sh');

// ─── Check if installed ───────────────────────────────────────────────────────
if (!fs.existsSync(SETTINGS_BACKUP)) {
  console.log('ℹ️   claude-statusline is not installed (no backup found).');
  process.exit(0);
}

// ─── Restore original settings.json ──────────────────────────────────────────
fs.copyFileSync(SETTINGS_BACKUP, SETTINGS_FILE);
fs.unlinkSync(SETTINGS_BACKUP);
console.log('✔  settings.json restored to original.');

// ─── Remove scripts ───────────────────────────────────────────────────────────
if (fs.existsSync(SCRIPT_DEST)) {
  fs.unlinkSync(SCRIPT_DEST);
  console.log('✔  statusline.sh removed.');
}
if (fs.existsSync(FETCH_DEST)) {
  fs.unlinkSync(FETCH_DEST);
  console.log('✔  fetch-usage.sh removed.');
}

console.log('\n✅  Uninstalled. Claude Code restored to default.');
