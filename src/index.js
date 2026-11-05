'use strict';
require('dotenv').config();
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const { checkEndpoint } = require('./checker');
const { sendDownAlert, sendRecoveryAlert } = require('./mailer');
const { printStatus } = require('./display');

// ── Config ────────────────────────────────────────────────────────────────────

const configPath = path.resolve(__dirname, '..', 'config.json');
let endpoints;

try {
  endpoints = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (err) {
  console.error(`[ERROR] Could not read config.json: ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(endpoints) || endpoints.length === 0) {
  console.error('[ERROR] config.json must be a non-empty JSON array.');
  process.exit(1);
}

// Validate required fields
for (const ep of endpoints) {
  if (!ep.name || !ep.url || !ep.expectedStatus || !ep.timeout) {
    console.error(`[ERROR] Each endpoint must have name, url, expectedStatus, and timeout. Check: ${JSON.stringify(ep)}`);
    process.exit(1);
  }
}

// ── State ─────────────────────────────────────────────────────────────────────

/** @type {Record<string, { status: string, lastChecked: Date|null, responseTime: number|null, error: string|null, alertSent: boolean }>} */
const states = {};
const events = [];

for (const ep of endpoints) {
  states[ep.name] = {
    status: 'UNKNOWN',
    lastChecked: null,
    responseTime: null,
    error: null,
    alertSent: false,
  };
}

function logEvent(msg) {
  events.unshift({ time: new Date(), msg });
  if (events.length > 20) events.pop();
}

// ── Check logic ───────────────────────────────────────────────────────────────

async function runChecks() {
  await Promise.all(
    endpoints.map(async (ep) => {
      const result = await checkEndpoint(ep);
      const state = states[ep.name];

      state.status = result.status;
      state.lastChecked = new Date();
      state.responseTime = result.responseTime;
      state.error = result.error;

      if (result.status === 'DOWN' && !state.alertSent) {
        // First detection of this outage — send alert once
        state.alertSent = true;
        logEvent(`DOWN: ${ep.name} — ${result.error}`);

        if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD && process.env.ALERT_RECIPIENT) {
          try {
            await sendDownAlert(ep, result.error, result.statusCode);
            logEvent(`Alert email sent for ${ep.name}`);
          } catch (err) {
            logEvent(`Failed to send alert for ${ep.name}: ${err.message}`);
          }
        }
      } else if (result.status === 'UP' && state.alertSent) {
        // Endpoint has recovered — clear flag and send recovery email
        state.alertSent = false;
        logEvent(`RECOVERED: ${ep.name}`);

        if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD && process.env.ALERT_RECIPIENT) {
          try {
            await sendRecoveryAlert(ep);
            logEvent(`Recovery email sent for ${ep.name}`);
          } catch (err) {
            logEvent(`Failed to send recovery alert for ${ep.name}: ${err.message}`);
          }
        }
      }
    })
  );

  printStatus(endpoints, states, events);
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

// Show table immediately (all statuses UNKNOWN) then kick off first check
printStatus(endpoints, states, events);
runChecks();

// Poll every 5 minutes
cron.schedule('*/5 * * * *', () => {
  runChecks();
});

// Refresh the display every 30 seconds so "last checked" times stay current
setInterval(() => {
  printStatus(endpoints, states, events);
}, 30_000);
