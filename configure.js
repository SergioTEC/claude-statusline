#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_FILE = path.join(os.homedir(), '.claude', 'statusline-config.json');

const FIELD_DEFS = [
  { id: 'model',   label: 'Model',   defaultColor: 'yellow'  },
  { id: 'input',   label: 'Input',   defaultColor: 'red'     },
  { id: 'output',  label: 'Output',  defaultColor: 'green'   },
  { id: 'total',   label: 'Total',   defaultColor: 'blue'    },
  { id: 'ctx',     label: 'CTX',     defaultColor: 'orange'  },
  { id: 'cost',    label: 'Cost',    defaultColor: 'white'   },
  { id: 'session', label: 'Session', defaultColor: 'cyan'    },
  { id: 'weekly',  label: 'Weekly',  defaultColor: 'magenta' },
];

const COLORS = [
  'red',          'green',          'yellow',          'blue',          'magenta',          'cyan',          'white',
  'bright_red',   'bright_green',   'bright_yellow',   'bright_blue',   'bright_magenta',   'bright_cyan',   'bright_white',
  'orange', 'pink', 'purple', 'gray',
];

const A = {
  red:            '\x1b[0;31m', green:          '\x1b[0;32m', yellow:         '\x1b[0;33m',
  blue:           '\x1b[0;34m', magenta:        '\x1b[0;35m', cyan:           '\x1b[0;36m',
  white:          '\x1b[0;37m',
  bright_red:     '\x1b[0;91m', bright_green:   '\x1b[0;92m', bright_yellow:  '\x1b[0;93m',
  bright_blue:    '\x1b[0;94m', bright_magenta: '\x1b[0;95m', bright_cyan:    '\x1b[0;96m',
  bright_white:   '\x1b[0;97m',
  orange:         '\x1b[38;5;208m', pink:        '\x1b[38;5;213m', purple:     '\x1b[38;5;129m',
  gray:           '\x1b[0;90m',
  reset:          '\x1b[0m',    bold:           '\x1b[1m',    dim:            '\x1b[2m',
};

const KEY = {
  UP:    '\x1b[A',
  DOWN:  '\x1b[B',
  RIGHT: '\x1b[C',
  LEFT:  '\x1b[D',
  ENTER: '\r',
  SPACE: ' ',
  ESC:   '\x1b',
  CTRLC: '\x03',
  CTRLD: '\x04',
};

function c(color, text) {
  return `${A[color] || A.reset}${text}${A.reset}`;
}

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      const fieldMap = Object.fromEntries(FIELD_DEFS.map(f => [f.id, { ...f }]));
      const seen = new Set();
      const result = [];
      for (const id of (raw.fields || [])) {
        if (fieldMap[id]) {
          result.push({ ...fieldMap[id], color: (raw.colors && raw.colors[id]) || fieldMap[id].defaultColor, enabled: true });
          seen.add(id);
        }
      }
      for (const f of FIELD_DEFS) {
        if (!seen.has(f.id)) {
          result.push({ ...f, color: (raw.colors && raw.colors[f.id]) || f.defaultColor, enabled: false });
        }
      }
      return result;
    } catch {}
  }
  return FIELD_DEFS.map(f => ({ ...f, color: f.defaultColor, enabled: true }));
}

function saveConfig(fields) {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({
    fields: fields.filter(f => f.enabled).map(f => f.id),
    colors: Object.fromEntries(fields.map(f => [f.id, f.color])),
  }, null, 2), 'utf8');
}

function render(fields, cursor, moving) {
  process.stdout.write('\x1b[2J\x1b[H');
  process.stdout.write(`${A.bold}claude-statusline — Configure${A.reset}\n\n`);

  fields.forEach((f, i) => {
    const sel = i === cursor;
    const check = f.enabled ? c('green', '✓') : c('gray', '✗');
    const label = (sel ? A.bold : '') + f.label.padEnd(9) + A.reset;

    let prefix, colorCol;

    if (moving && sel) {
      prefix   = `  ${c('yellow', '↕')} `;
      colorCol = `  ${c(f.color, '●')} ${c(f.color, f.color)}`;
    } else if (sel) {
      prefix   = `  ${c('cyan', '›')} `;
      colorCol = `  ${A.dim}‹${A.reset} ${c(f.color, f.color.padEnd(8))}${A.dim}›${A.reset}`;
    } else {
      prefix   = '    ';
      colorCol = `  ${c(f.color, '●')} ${c(f.color, f.color)}`;
    }

    process.stdout.write(`${prefix}[${check}] ${label} ${colorCol}\n`);
  });

  process.stdout.write('\n');

  if (moving) {
    process.stdout.write(
      `  ${A.dim}↑↓${A.reset} reorder   ` +
      `${A.dim}Enter/M${A.reset} drop\n`
    );
  } else {
    process.stdout.write(
      `  ${A.dim}↑↓${A.reset} navigate   ` +
      `${A.dim}←→${A.reset} color   ` +
      `${A.dim}Space${A.reset} toggle   ` +
      `${A.dim}M${A.reset} move   ` +
      `${A.dim}S${A.reset} save   ` +
      `${A.dim}Q${A.reset} quit\n`
    );
  }
}

function cleanup() {
  try { process.stdin.setRawMode(false); } catch {}
  process.stdin.pause();
}

function run() {
  if (!process.stdin.isTTY) {
    console.error('configure requires an interactive terminal.');
    process.exit(1);
  }

  const fields = loadConfig();
  let cursor = 0;
  let moving = false;

  render(fields, cursor, moving);

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (key) => {
    if (key === KEY.CTRLC || key === KEY.CTRLD) {
      cleanup();
      process.stdout.write('\x1b[2J\x1b[H');
      console.log('\nExited without saving.\n');
      process.exit(0);
    }

    if (moving) {
      if (key === KEY.UP && cursor > 0) {
        [fields[cursor - 1], fields[cursor]] = [fields[cursor], fields[cursor - 1]];
        cursor--;
      } else if (key === KEY.DOWN && cursor < fields.length - 1) {
        [fields[cursor + 1], fields[cursor]] = [fields[cursor], fields[cursor + 1]];
        cursor++;
      } else if (key === KEY.ENTER || key === 'm' || key === 'M' || key === KEY.ESC) {
        moving = false;
      }
    } else {
      if (key === KEY.UP && cursor > 0) {
        cursor--;
      } else if (key === KEY.DOWN && cursor < fields.length - 1) {
        cursor++;
      } else if (key === KEY.LEFT) {
        const ci = COLORS.indexOf(fields[cursor].color);
        fields[cursor].color = COLORS[(ci - 1 + COLORS.length) % COLORS.length];
      } else if (key === KEY.RIGHT) {
        const ci = COLORS.indexOf(fields[cursor].color);
        fields[cursor].color = COLORS[(ci + 1) % COLORS.length];
      } else if (key === KEY.SPACE) {
        fields[cursor].enabled = !fields[cursor].enabled;
      } else if (key === 'm' || key === 'M') {
        moving = true;
      } else if (key === 's' || key === 'S') {
        saveConfig(fields);
        cleanup();
        process.stdout.write('\x1b[2J\x1b[H');
        const enabled = fields.filter(f => f.enabled).length;
        console.log(`\n${c('green', '✔')}  Saved to ${CONFIG_FILE}`);
        console.log(`   ${enabled} field(s) active.\n`);
        process.exit(0);
      } else if (key === 'q' || key === 'Q' || key === KEY.ESC) {
        cleanup();
        process.stdout.write('\x1b[2J\x1b[H');
        console.log('\nExited without saving.\n');
        process.exit(0);
      }
    }

    render(fields, cursor, moving);
  });
}

run();
