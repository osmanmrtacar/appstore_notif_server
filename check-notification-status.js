/**
 * Check the status of a test notification
 * Usage: node check-notification-status.js <testNotificationToken>
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const fs = require('fs');

const ISSUER_ID = process.env.APPLE_ISSUER_ID;
const KEY_ID = process.env.APPLE_KEY_ID;
const BUNDLE_ID = process.env.APPLE_BUNDLE_ID;
const PRIVATE_KEY_PATH = process.env.APPLE_PRIVATE_KEY_PATH;
const ENVIRONMENT = process.env.APPLE_ENVIRONMENT || 'sandbox';

const ENDPOINTS = {
  sandbox: 'https://api.storekit-sandbox.itunes.apple.com/inApps/v1/notifications/test',
  production: 'https://api.storekit.itunes.apple.com/inApps/v1/notifications/test'
};

function generateToken() {
  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
  return jwt.sign(
    { bid: BUNDLE_ID },
    privateKey,
    {
      algorithm: 'ES256',
      expiresIn: '60m',
      audience: 'appstoreconnect-v1',
      issuer: ISSUER_ID,
      header: { alg: 'ES256', kid: KEY_ID, typ: 'JWT' }
    }
  );
}

async function checkStatus(testNotificationToken) {
  const token = generateToken();
  const endpoint = `${ENDPOINTS[ENVIRONMENT]}/${testNotificationToken}`;

  console.log(`📡 Checking notification status...\n`);
  console.log(`Endpoint: ${endpoint}\n`);

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

  if (response.ok) {
    console.log('✅ Status retrieved successfully!\n');
    console.log(JSON.stringify(data, null, 2));

    if (data.sendAttempts && data.sendAttempts.length > 0) {
      console.log('\n📬 Send Attempts:');
      data.sendAttempts.forEach((attempt, i) => {
        console.log(`\nAttempt ${i + 1}:`);
        console.log(`  Time: ${new Date(attempt.attemptDate).toISOString()}`);
        console.log(`  Result: ${attempt.sendAttemptResult}`);
      });
    }
  } else {
    console.error('❌ Failed to get status');
    console.error(JSON.stringify(data, null, 2));
  }
}

const token = process.argv[2] || '39a16b80-a18f-4979-b01f-3cc637b76ff3_1767551487168';
checkStatus(token).catch(console.error);
