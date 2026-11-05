'use strict';
const axios = require('axios');

/**
 * Checks a single endpoint and returns its health result.
 * @param {{ name: string, url: string, expectedStatus: number, timeout: number }} ep
 * @returns {{ status: 'UP'|'DOWN', responseTime: number, error: string|null, statusCode: number|null }}
 */
async function checkEndpoint(ep) {
  const start = Date.now();
  try {
    const response = await axios.get(ep.url, {
      timeout: ep.timeout,
      headers: ep.headers || {},
      // Never throw on HTTP error codes — we check the status ourselves
      validateStatus: () => true,
    });
    const responseTime = Date.now() - start;

    if (response.status !== ep.expectedStatus) {
      return {
        status: 'DOWN',
        responseTime,
        error: `Expected HTTP ${ep.expectedStatus}, got ${response.status}`,
        statusCode: response.status,
      };
    }

    return { status: 'UP', responseTime, error: null, statusCode: response.status };
  } catch (err) {
    const responseTime = Date.now() - start;
    const isTimeout =
      err.code === 'ECONNABORTED' ||
      err.code === 'ETIMEDOUT' ||
      (err.message && err.message.toLowerCase().includes('timeout'));
    return {
      status: 'DOWN',
      responseTime,
      error: isTimeout ? `Timed out after ${ep.timeout}ms` : err.message,
      statusCode: null,
    };
  }
}

module.exports = { checkEndpoint };
