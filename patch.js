#!/usr/bin/env node
/**
 * claude-statusline patcher
 * Patches the Claude Code VS Code extension to always show
 * token usage in the chat with detailed information.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const EXTENSION_DIR = path.join(os.homedir(), '.vscode', 'extensions');
const WEBVIEW_FILE = 'webview/index.js';

// ─── Find the latest installed extension version ──────────────────────────────
function findExtension() {
  const entries = fs.readdirSync(EXTENSION_DIR)
    .filter(d => d.startsWith('anthropic.claude-code-'))
    .sort()
    .reverse();

  if (entries.length === 0) {
    console.error('❌  Claude Code extension not found in ~/.vscode/extensions');
    process.exit(1);
  }

  const chosen = entries[0];
  console.log(`✔  Extension found: ${chosen}`);
  return path.join(EXTENSION_DIR, chosen, WEBVIEW_FILE);
}

// ─── Token formatter (e.g. 83600 → "83.6k") ──────────────────────────────────
const FMT_FN = `function _fmtTok(n){if(n>=1e6)return(n/1e6).toFixed(1)+'M';if(n>=1e3)return(n/1e3).toFixed(1)+'k';return String(n);}`;

// ─── Patches to apply ────────────────────────────────────────────────────────
const PATCHES = [
  {
    name: 'Always show token indicator',
    find: 'if(rG1===null){if(Z===0)return null;if(z>=50)return null}',
    replace: 'if(rG1===null){if(Z===0)return null;}',
  },
  {
    name: 'Tooltip with exact token counts',
    find: '`${Math.round(U)}% context used — click to compact`',
    replace: '`${Math.round(U)}% used — ${_fmtTok($)}/${_fmtTok(Z)} tokens`',
  },
  {
    name: 'Popup with exact token counts and progress bar',
    find: 'Nj.default.createElement("div",{className:Oj.remainingText},Math.round(z),"% of context remaining until auto-compact.")',
    replace: [
      'Nj.default.createElement("div",{className:Oj.remainingText},',
      '  `${_fmtTok($)} of ${_fmtTok(Z)} tokens used (${Math.round(U)}%)`),',
      'Nj.default.createElement("div",{style:{',
      '  width:"100%",height:"6px",background:"var(--vscode-widget-border,#444)",',
      '  borderRadius:"3px",margin:"6px 0",overflow:"hidden"}},',
      '  Nj.default.createElement("div",{style:{',
      '    width:`${Math.min(U,100)}%`,height:"100%",',
      '    background: U>85?"#e05555":U>60?"#e0a955":"#55a0e0",',
      '    borderRadius:"3px",transition:"width 0.3s"}})',
      '),',
      'Nj.default.createElement("div",{className:Oj.remainingText},',
      '  `${Math.round(z)}% remaining until auto-compact`)',
    ].join(''),
  },
  {
    name: 'Inject token formatter function',
    find: 'function dn1(',
    replace: `${FMT_FN}function dn1(`,
  },
];

// ─── Apply patch ─────────────────────────────────────────────────────────────
function applyPatch(filePath) {
  const backupPath = filePath + '.claude-statusline-backup';

  if (fs.existsSync(backupPath)) {
    console.log('⚠️   Backup already exists — extension may already be patched.');
    console.log('    Run  node restore.js  to revert before re-patching.');
    process.exit(1);
  }

  let code = fs.readFileSync(filePath, 'utf8');

  // Backup
  fs.copyFileSync(filePath, backupPath);
  console.log(`✔  Backup created: ${backupPath}`);

  // Apply patches in order (unique strings, so order doesn't affect offsets)
  for (const patch of PATCHES) {
    if (!code.includes(patch.find)) {
      console.error(`❌  Patch "${patch.name}" — target string not found.`);
      console.error(`    The extension version may have changed.`);
      // Restaurar backup
      fs.copyFileSync(backupPath, filePath);
      fs.unlinkSync(backupPath);
      console.log('↩️   Backup restored automatically.');
      process.exit(1);
    }
    code = code.replace(patch.find, patch.replace);
    console.log(`✔  Patch applied: ${patch.name}`);
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log('\n✅  Patch complete!');
  console.log('   → Reload VS Code: Ctrl+Shift+P → "Developer: Reload Window"');
}

// ─── Main ────────────────────────────────────────────────────────────────────
const webviewPath = findExtension();
applyPatch(webviewPath);
