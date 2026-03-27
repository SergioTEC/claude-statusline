#!/usr/bin/env node
'use strict';

const arg = process.argv[2];

if (arg === '--help' || arg === '-h') {
  console.log('Usage: npx @sergiojr/claude-statusline [command]');
  console.log('');
  console.log('Commands:');
  console.log('  install    Install the status line (default)');
  console.log('  uninstall  Remove the status line and restore settings');
  console.log('  configure  Interactive configuration (fields, order, colors)');
  console.log('');
  console.log('Examples:');
  console.log('  npx @sergiojr/claude-statusline');
  console.log('  npx @sergiojr/claude-statusline install');
  console.log('  npx @sergiojr/claude-statusline configure');
  console.log('  npx @sergiojr/claude-statusline uninstall');
  process.exit(0);
}

if (arg === 'uninstall') {
  require('../uninstall.js');
} else if (arg === 'configure') {
  require('../configure.js');
} else if (!arg || arg === 'install') {
  require('../install.js');
} else {
  console.error(`Unknown command: ${arg}`);
  console.error('Run with --help for usage.');
  process.exit(1);
}
