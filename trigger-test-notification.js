/**
 * Script to trigger a test notification from Apple's App Store Server API
 *
 * This uses the "Request a Test Notification" endpoint to send a TEST notification
 * to your configured webhook URL.
 *
 * Documentation: https://developer.apple.com/documentation/appstoreserverapi/request-a-test-notification
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const fs = require('fs');

// Configuration - Add these to your .env file
const ISSUER_ID = process.env.APPLE_ISSUER_ID; // Your issuer ID from App Store Connect
const KEY_ID = process.env.APPLE_KEY_ID; // Your API Key ID
const BUNDLE_ID = process.env.APPLE_BUNDLE_ID; // Your app's bundle ID
const PRIVATE_KEY_PATH = process.env.APPLE_PRIVATE_KEY_PATH || './AuthKey.p8'; // Path to your .p8 file
const ENVIRONMENT = process.env.APPLE_ENVIRONMENT || 'sandbox'; // 'sandbox' or 'production'

// API endpoints
const ENDPOINTS = {
  sandbox: 'https://api.storekit-sandbox.itunes.apple.com/inApps/v1/notifications/test',
  production: 'https://api.storekit.itunes.apple.com/inApps/v1/notifications/test'
};

/**
 * Generate JWT token for App Store Server API authentication
 */
function generateToken() {
  try {
    const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

    const token = jwt.sign(
      {
        bid: BUNDLE_ID
      },
      privateKey,
      {
        algorithm: 'ES256',
        expiresIn: '60m',
        audience: 'appstoreconnect-v1',
        issuer: ISSUER_ID,
        header: {
          alg: 'ES256',
          kid: KEY_ID,
          typ: 'JWT'
        }
      }
    );

    return token;
  } catch (error) {
    console.error('Error generating JWT token:', error.message);
    throw error;
  }
}

/**
 * Request a test notification from Apple
 */
async function requestTestNotification() {
  console.log('🚀 Requesting test notification from Apple...\n');

  // Validate configuration
  if (!ISSUER_ID || !KEY_ID || !BUNDLE_ID) {
    console.error('❌ Missing required configuration!');
    console.error('Please set the following in your .env file:');
    console.error('  - APPLE_ISSUER_ID');
    console.error('  - APPLE_KEY_ID');
    console.error('  - APPLE_BUNDLE_ID');
    console.error('  - APPLE_PRIVATE_KEY_PATH (optional, defaults to ./AuthKey.p8)');
    process.exit(1);
  }

  if (!fs.existsSync(PRIVATE_KEY_PATH)) {
    console.error(`❌ Private key file not found: ${PRIVATE_KEY_PATH}`);
    console.error('Download your API key from App Store Connect and place it in the project root.');
    process.exit(1);
  }

  try {
    // Generate authentication token
    console.log('📝 Generating JWT token...');
    const token = generateToken();
    console.log('✓ JWT token generated\n');

    // Make API request
    const endpoint = ENDPOINTS[ENVIRONMENT];
    console.log(`📡 Sending request to: ${endpoint}`);
    console.log(`   Environment: ${ENVIRONMENT}`);
    console.log(`   Bundle ID: ${BUNDLE_ID}\n`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Test notification requested successfully!\n');
      console.log('Response:', JSON.stringify(data, null, 2));
      console.log('\n📬 Apple will send a TEST notification to your configured webhook URL.');
      console.log('   Check your server logs for the incoming notification.\n');

      if (data.testNotificationToken) {
        console.log(`🔍 Test Notification Token: ${data.testNotificationToken}`);
        console.log('   You can use this token to check the status with:');
        console.log(`   GET ${endpoint}/${data.testNotificationToken}`);
      }
    } else {
      console.error('❌ Request failed!');
      console.error(`Status: ${response.status} ${response.statusText}`);
      console.error('Response:', JSON.stringify(data, null, 2));

      if (response.status === 401) {
        console.error('\n💡 Authentication failed. Check:');
        console.error('   - ISSUER_ID, KEY_ID are correct');
        console.error('   - Private key file is valid');
        console.error('   - API key has not been revoked');
      } else if (response.status === 404) {
        console.error('\n💡 Not found. Check:');
        console.error('   - BUNDLE_ID is correct');
        console.error('   - App exists in App Store Connect');
        console.error('   - Using correct environment (sandbox vs production)');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
requestTestNotification();
