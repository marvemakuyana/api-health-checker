# API Health Checker

Polls a list of API endpoints every 5 minutes. Sends Gmail alerts when an endpoint goes down, and a recovery email when it comes back up. Displays a live status table in the terminal.

## Features

- Polls endpoints on a 5-minute cron schedule
- Detects failures: unexpected status codes, timeouts, and network errors
- Sends a **down alert** email once per outage (no repeated spam)
- Sends a **recovery email** when the endpoint comes back up
- Live terminal table: endpoint name, URL, UP/DOWN status, last checked time, response time
- Configurable endpoints via `config.json`
- Gmail credentials and recipient stored in `.env`

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

```
GMAIL_USER=your-gmail-address@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
ALERT_RECIPIENT=recipient@example.com
```

**Gmail App Password** — You must use an App Password, not your regular Gmail password:
1. Enable 2-Step Verification on your Google account
2. Go to [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Create a new app password (select "Mail" and your device)
4. Copy the 16-character password into `GMAIL_APP_PASSWORD`

### 3. Configure endpoints

Edit `config.json` to define the endpoints you want to monitor:

```json
[
  {
    "name": "My API",
    "url": "https://api.example.com/health",
    "expectedStatus": 200,
    "timeout": 5000
  }
]
```

| Field            | Type   | Description                                      |
|------------------|--------|--------------------------------------------------|
| `name`           | string | Display name shown in the terminal and emails    |
| `url`            | string | Full URL to poll (GET request)                   |
| `expectedStatus` | number | HTTP status code considered healthy (e.g. `200`) |
| `timeout`        | number | Request timeout in milliseconds                  |

### 4. Run

```bash
npm start
```

The terminal will show a live status table that refreshes after every check cycle and every 30 seconds between cycles.

## Project Structure

```
api-health-checker/
├── src/
│   ├── index.js      # Entry point: loads config, runs cron, orchestrates checks
│   ├── checker.js    # HTTP request logic, timeout and error handling
│   ├── mailer.js     # Nodemailer email templates (down + recovery)
│   └── display.js    # Terminal status table rendering
├── config.json       # List of endpoints to monitor
├── .env              # Your credentials (not committed)
├── .env.example      # Template for .env
└── package.json
```

## Alert behaviour

| Scenario                          | Action                             |
|-----------------------------------|------------------------------------|
| Endpoint goes DOWN                | Send one down alert email          |
| Endpoint stays DOWN on next poll  | No email (already alerted)         |
| Endpoint comes back UP            | Send one recovery email            |
| Endpoint stays UP                 | No email                           |

## Failure modes detected

- **Wrong status code** — e.g. got 500, expected 200
- **Timeout** — request took longer than the configured `timeout` ms
- **Network error** — DNS failure, connection refused, etc.
