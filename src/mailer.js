'use strict';
const nodemailer = require('nodemailer');

function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

const baseStyle = `
  font-family: Arial, sans-serif;
  font-size: 14px;
  color: #333;
`;

const tableStyle = `
  border-collapse: collapse;
  margin-top: 12px;
  width: 100%;
  max-width: 600px;
`;

const tdStyle = `
  padding: 8px 12px;
  border: 1px solid #ddd;
  vertical-align: top;
`;

const labelStyle = `${tdStyle} font-weight: bold; background: #f5f5f5; width: 140px;`;

function row(label, value) {
  return `
    <tr>
      <td style="${labelStyle}">${label}</td>
      <td style="${tdStyle}">${value}</td>
    </tr>`;
}

/**
 * Sends a "down" alert email for an endpoint.
 */
async function sendDownAlert(ep, error, statusCode) {
  const transporter = createTransporter();
  const timestamp = new Date().toLocaleString();

  const statusRow = statusCode != null ? row('Status Code', statusCode) : '';

  await transporter.sendMail({
    from: `"API Health Checker" <${process.env.GMAIL_USER}>`,
    to: process.env.ALERT_RECIPIENT,
    subject: `[DOWN] ${ep.name} is not responding`,
    html: `
      <div style="${baseStyle}">
        <h2 style="color:#c0392b;">&#x26A0;&#xFE0F; API Endpoint Down</h2>
        <p>An endpoint has gone <strong>DOWN</strong> and requires your attention.</p>
        <table style="${tableStyle}">
          ${row('Endpoint', ep.name)}
          ${row('URL', `<a href="${ep.url}">${ep.url}</a>`)}
          ${row('Error', `<span style="color:#c0392b;">${error}</span>`)}
          ${statusRow}
          ${row('Detected At', timestamp)}
        </table>
        <p style="color:#888;font-size:12px;margin-top:20px;">
          This is an automated alert from API Health Checker.
          A recovery email will be sent when the endpoint comes back up.
        </p>
      </div>
    `,
  });
}

/**
 * Sends a "recovered" alert email for an endpoint.
 */
async function sendRecoveryAlert(ep) {
  const transporter = createTransporter();
  const timestamp = new Date().toLocaleString();

  await transporter.sendMail({
    from: `"API Health Checker" <${process.env.GMAIL_USER}>`,
    to: process.env.ALERT_RECIPIENT,
    subject: `[RECOVERED] ${ep.name} is back up`,
    html: `
      <div style="${baseStyle}">
        <h2 style="color:#27ae60;">&#x2705; API Endpoint Recovered</h2>
        <p>The following endpoint is now responding as expected.</p>
        <table style="${tableStyle}">
          ${row('Endpoint', ep.name)}
          ${row('URL', `<a href="${ep.url}">${ep.url}</a>`)}
          ${row('Recovered At', timestamp)}
        </table>
        <p style="color:#888;font-size:12px;margin-top:20px;">
          This is an automated alert from API Health Checker.
        </p>
      </div>
    `,
  });
}

module.exports = { sendDownAlert, sendRecoveryAlert };
