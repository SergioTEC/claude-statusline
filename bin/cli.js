#!/usr/bin/env node
'use strict';

const arg = process.argv[2];

if (arg === '--help' || arg === '-h') {
  console.log('Usage: npx claudecode-statusline [command]');
  console.log('');
  console.log('Commands:');
  console.log('  install    Install the status line (default)');
  console.log('  uninstall  Remove the status line and restore settings');
  console.log('');
  console.log('Examples:');
  console.log('  npx claudecode-statusline');
  console.log('  npx claudecode-statusline install');
  console.log('  npx claudecode-statusline uninstall');
  process.exit(0);
}

if (arg === 'uninstall') {
  require('../uninstall.js');
} else if (!arg || arg === 'install') {
  require('../install.js');
} else {
  console.error(`Unknown command: ${arg}`);
  console.error('Run with --help for usage.');
  process.exit(1);
}
