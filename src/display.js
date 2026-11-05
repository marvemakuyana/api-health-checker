'use strict';
const Table = require('cli-table3');
const chalk = require('chalk');

const POLL_MINUTES = 5;

function timeSince(date) {
  if (!date) return chalk.dim('Pending...');
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return chalk.dim(`${secs}s ago`);
  const mins = Math.floor(secs / 60);
  if (mins < 60) return chalk.dim(`${mins}m ${secs % 60}s ago`);
  return chalk.dim(`${Math.floor(mins / 60)}h ${mins % 60}m ago`);
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function printStatus(endpoints, states, events = []) {
  // Move cursor to top-left and clear screen so the table redraws in place
  process.stdout.write('\x1B[2J\x1B[0f');

  const now = new Date().toLocaleString();
  console.log(chalk.bold.cyan(`\n  API Health Checker`));
  console.log(chalk.gray(`  ${now}  |  Polling every ${POLL_MINUTES} minutes\n`));

  const table = new Table({
    head: [
      chalk.bold('Endpoint'),
      chalk.bold('URL'),
      chalk.bold('Status'),
      chalk.bold('Last Checked'),
      chalk.bold('Response Time'),
      chalk.bold('Details'),
    ],
    colWidths: [20, 38, 9, 16, 15, 36],
    wordWrap: false,
    style: { head: [], border: ['grey'] },
  });

  for (const ep of endpoints) {
    const s = states[ep.name];

    const statusCell =
      s.status === 'UP'
        ? chalk.green.bold('  UP  ')
        : s.status === 'DOWN'
        ? chalk.red.bold(' DOWN ')
        : chalk.yellow.bold('  ???  ');

    const responseCell =
      s.responseTime != null ? chalk.cyan(`${s.responseTime}ms`) : chalk.dim('-');

    const detailCell =
      s.status === 'DOWN' && s.error
        ? chalk.red(truncate(s.error, 34))
        : s.status === 'UP'
        ? chalk.green('OK')
        : chalk.dim('-');

    table.push([
      truncate(ep.name, 18),
      chalk.gray(truncate(ep.url, 36)),
      statusCell,
      timeSince(s.lastChecked),
      responseCell,
      detailCell,
    ]);
  }

  console.log(table.toString());

  // Recent events log
  if (events.length > 0) {
    console.log(chalk.bold.white('\n  Recent Events\n'));
    for (const ev of events.slice(0, 8)) {
      const time = chalk.dim(ev.time.toLocaleTimeString());
      const icon =
        ev.msg.startsWith('DOWN') ? chalk.red('▼') :
        ev.msg.startsWith('RECOVERED') ? chalk.green('▲') :
        ev.msg.startsWith('Alert') || ev.msg.startsWith('Recovery') ? chalk.blue('✉') :
        chalk.yellow('!');
      console.log(`  ${time}  ${icon}  ${ev.msg}`);
    }
  }

  console.log(chalk.dim('\n  Press Ctrl+C to exit.\n'));
}

module.exports = { printStatus };
