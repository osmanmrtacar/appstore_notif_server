require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON with raw body for signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

// JWKS client to fetch Apple's public keys
const client = jwksClient({
  jwksUri: 'https://appleid.apple.com/auth/keys',
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
  rateLimit: true
});

// Function to get signing key from Apple
function getKey(header, callback) {
  // If kid is present, use it directly
  if (header.kid) {
    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        callback(err);
        return;
      }
      const signingKey = key.getPublicKey();
      callback(null, signingKey);
    });
  } else {
    // If no kid, fetch all keys and try to find the right one
    // This shouldn't normally happen with Apple's tokens, but we handle it anyway
    console.warn('Warning: JWT token has no kid in header');
    callback(new Error('No KID specified in JWT header'));
  }
}

// Function to fetch all JWKS keys
async function getAllKeys() {
  const response = await fetch('https://appleid.apple.com/auth/keys');
  const jwks = await response.json();
  return jwks.keys;
}

// Function to verify and decode JWT token
async function verifyToken(token) {
  // First, try the standard verification with kid
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      algorithms: ['ES256'],
      issuer: 'https://appleid.apple.com'
    }, async (err, decoded) => {
      if (err && err.message.includes('No KID specified')) {
        // If kid is missing, try all available keys
        console.log('Attempting verification with all available keys...');
        try {
          const keys = await getAllKeys();

          for (const key of keys) {
            try {
              // Convert JWK to PEM format for verification
              const publicKey = await jwkToPem(key);
              const decoded = jwt.verify(token, publicKey, {
                algorithms: ['ES256'],
                issuer: 'https://appleid.apple.com'
              });
              console.log(`✓ Token verified successfully with key: ${key.kid}`);
              resolve(decoded);
              return;
            } catch (keyErr) {
              // Try next key
              continue;
            }
          }
          reject(new Error('Token could not be verified with any available key'));
        } catch (fetchErr) {
          reject(fetchErr);
        }
      } else if (err) {
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
}

// Helper function to convert JWK to PEM (for ES256 keys)
async function jwkToPem(jwk) {
  const { createPublicKey } = require('crypto');
  return createPublicKey({ key: jwk, format: 'jwk' });
}

// Function to decode JWT payload without verification (for nested tokens)
function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    return payload;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug endpoint to inspect JWT structure
app.post('/debug/jwt', async (req, res) => {
  try {
    const { signedPayload } = req.body;

    if (!signedPayload) {
      return res.status(400).json({ error: 'Missing signedPayload' });
    }

    // Decode header without verification
    const parts = signedPayload.split('.');
    if (parts.length !== 3) {
      return res.status(400).json({ error: 'Invalid JWT format' });
    }

    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString('utf8'));
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));

    console.log('\n--- JWT Debug Info ---');
    console.log('Header:', JSON.stringify(header, null, 2));
    console.log('Has KID:', !!header.kid);
    if (header.kid) {
      console.log('KID value:', header.kid);
    }
    console.log('Algorithm:', header.alg);
    console.log('Notification Type:', payload.notificationType);

    // Try to verify
    let verificationResult = { verified: false, error: null };
    try {
      await verifyToken(signedPayload);
      verificationResult.verified = true;
      console.log('✓ JWT verification: SUCCESS');
    } catch (err) {
      verificationResult.error = err.message;
      console.log('✗ JWT verification: FAILED -', err.message);
    }

    console.log('--- End Debug Info ---\n');

    res.json({
      header,
      payload,
      verification: verificationResult
    });

  } catch (error) {
    console.error('Error debugging JWT:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to simulate notifications (bypasses JWT verification)
app.post('/test/notification', async (req, res) => {
  try {
    console.log('Received TEST notification');

    const { notificationType, subtype, transactionInfo, renewalInfo } = req.body;

    if (!notificationType) {
      return res.status(400).json({ error: 'Missing notificationType' });
    }

    // Call the handler directly
    await handleNotification(notificationType, subtype, {}, transactionInfo, renewalInfo);

    res.status(200).json({ status: 'test notification processed' });
  } catch (error) {
    console.error('Error processing test notification:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Main endpoint for App Store Server Notifications
app.post('/appstore/notifications', async (req, res) => {
  try {
    console.log('Received notification from App Store');

    const { signedPayload } = req.body;

    if (!signedPayload) {
      console.error('Missing signedPayload in request');
      return res.status(400).json({ error: 'Missing signedPayload' });
    }

    // Verify the outer JWT signature
    let verifiedPayload;
    try {
      verifiedPayload = await verifyToken(signedPayload);
      console.log('✓ JWT signature verified');
    } catch (err) {
      console.error('JWT verification failed:', err.message);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Extract notification type and subtype
    const notificationType = verifiedPayload.notificationType;
    const subtype = verifiedPayload.subtype;

    console.log(`Notification Type: ${notificationType}`);
    if (subtype) {
      console.log(`Subtype: ${subtype}`);
    }

    // Decode the nested signedTransactionInfo and signedRenewalInfo if present
    let transactionInfo = null;
    let renewalInfo = null;

    if (verifiedPayload.data?.signedTransactionInfo) {
      transactionInfo = decodeJWT(verifiedPayload.data.signedTransactionInfo);
      console.log('Transaction Info:', JSON.stringify(transactionInfo, null, 2));
    }

    if (verifiedPayload.data?.signedRenewalInfo) {
      renewalInfo = decodeJWT(verifiedPayload.data.signedRenewalInfo);
      console.log('Renewal Info:', JSON.stringify(renewalInfo, null, 2));
    }

    // Handle different notification types
    await handleNotification(notificationType, subtype, verifiedPayload, transactionInfo, renewalInfo);

    // Always respond with 200 to acknowledge receipt
    res.status(200).json({ status: 'received' });

  } catch (error) {
    console.error('Error processing notification:', error);
    // Still return 200 to prevent Apple from retrying
    res.status(200).json({ status: 'error', message: error.message });
  }
});

// Notification handler function
async function handleNotification(notificationType, subtype, payload, transactionInfo, renewalInfo) {
  console.log('\n--- Processing Notification ---');

  switch (notificationType) {
    case 'SUBSCRIBED':
      console.log('✓ New subscription started');
      // TODO: Add logic to activate user's subscription in your database
      break;

    case 'DID_RENEW':
      console.log('✓ Subscription renewed successfully');
      // TODO: Extend user's subscription period
      break;

    case 'DID_FAIL_TO_RENEW':
      console.log('⚠ Subscription renewal failed');
      if (subtype === 'GRACE_PERIOD') {
        console.log('  → User is in grace period');
        // TODO: Notify user about payment issue
      }
      break;

    case 'DID_CHANGE_RENEWAL_STATUS':
      if (subtype === 'AUTO_RENEW_ENABLED') {
        console.log('✓ User enabled auto-renewal');
      } else if (subtype === 'AUTO_RENEW_DISABLED') {
        console.log('⚠ User disabled auto-renewal');
        // TODO: Flag subscription as expiring
      }
      break;

    case 'EXPIRED':
      console.log('⚠ Subscription expired');
      if (subtype === 'VOLUNTARY') {
        console.log('  → User cancelled');
      } else if (subtype === 'BILLING_RETRY') {
        console.log('  → Expired due to billing issues');
      }
      // TODO: Revoke user's access
      break;

    case 'GRACE_PERIOD_EXPIRED':
      console.log('⚠ Grace period expired, subscription cancelled');
      // TODO: Revoke user's access
      break;

    case 'OFFER_REDEEMED':
      console.log('✓ User redeemed a promotional offer');
      break;

    case 'PRICE_INCREASE':
      if (subtype === 'PENDING') {
        console.log('📢 Price increase pending user consent');
      } else if (subtype === 'ACCEPTED') {
        console.log('✓ User accepted price increase');
      }
      break;

    case 'REFUND':
      console.log('⚠ Transaction was refunded');
      // TODO: Revoke user's access and update records
      break;

    case 'REFUND_DECLINED':
      console.log('✓ Refund request was declined');
      break;

    case 'RENEWAL_EXTENDED':
      console.log('✓ Subscription renewal date extended');
      break;

    case 'REVOKE':
      console.log('⚠ Purchase revoked (family sharing removed or refund)');
      // TODO: Revoke user's access immediately
      break;

    case 'TEST':
      console.log('🧪 Test notification from App Store Connect');
      break;

    default:
      console.log(`⚠ Unknown notification type: ${notificationType}`);
  }

  // Log transaction and renewal details
  if (transactionInfo) {
    console.log(`Transaction ID: ${transactionInfo.transactionId}`);
    console.log(`Product ID: ${transactionInfo.productId}`);
    if (transactionInfo.expiresDate) {
      console.log(`Expires: ${new Date(transactionInfo.expiresDate).toISOString()}`);
    }
  }

  if (renewalInfo) {
    console.log(`Auto-Renew Status: ${renewalInfo.autoRenewStatus === 1 ? 'Enabled' : 'Disabled'}`);
  }

  // Send notification to Discord webhook
  try {
    const webhookData = {
      notificationType,
      subtype,
      transactionInfo,
      renewalInfo,
      timestamp: new Date().toISOString()
    };

    const response = await fetch('https://flows.deplo.xyz/webhook/discord_call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookData)
    });

    if (response.ok) {
      console.log('✓ Discord webhook called successfully');
    } else {
      console.error(`⚠ Discord webhook failed with status: ${response.status}`);
    }
  } catch (error) {
    console.error('⚠ Error calling Discord webhook:', error.message);
  }

  console.log('--- End Processing ---\n');
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 App Store Server Notifications server running on port ${PORT}`);
  console.log(`📍 Endpoint: http://localhost:${PORT}/appstore/notifications`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});
