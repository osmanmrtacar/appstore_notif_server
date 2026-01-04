# App Store Server Notifications Handler

A Node.js server that receives and processes Apple App Store Server Notifications (Version 2) with JWT signature verification.

## Features

- ✅ JWT signature verification using Apple's public keys
- ✅ Automatic JWKS key caching and rotation
- ✅ Handles all App Store Server Notification types
- ✅ Decodes nested transaction and renewal information
- ✅ Production-ready error handling
- ✅ Health check endpoint

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
   - `PORT` - Server port (default: 3000)
   - `WEBHOOK_URL` - Optional webhook URL to send notifications (e.g., Discord, Slack, your API)

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## Endpoints

### POST /appstore/notifications
Main endpoint to receive App Store Server Notifications from Apple.

**Request Body:**
```json
{
  "signedPayload": "eyJhbGc..."
}
```

**Response:**
```json
{
  "status": "received"
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Notification Types Handled

The server handles all App Store Server Notification V2 types:

- **SUBSCRIBED** - Initial purchase of subscription
- **DID_RENEW** - Successful subscription renewal
- **DID_FAIL_TO_RENEW** - Failed renewal (includes GRACE_PERIOD subtype)
- **DID_CHANGE_RENEWAL_STATUS** - Auto-renewal enabled/disabled
- **EXPIRED** - Subscription expired (VOLUNTARY or BILLING_RETRY)
- **GRACE_PERIOD_EXPIRED** - Grace period ended without renewal
- **OFFER_REDEEMED** - Promotional offer redeemed
- **PRICE_INCREASE** - Price increase (PENDING or ACCEPTED)
- **REFUND** - Transaction refunded
- **REFUND_DECLINED** - Refund request declined
- **RENEWAL_EXTENDED** - Subscription extended
- **REVOKE** - Purchase revoked
- **TEST** - Test notification

## Setting Up in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app
3. Go to **General** → **App Information**
4. Scroll to **App Store Server Notifications**
5. Enter your server URL: `https://yourdomain.com/appstore/notifications`
6. Click **Save**

### Testing Notifications

You can test notifications in App Store Connect:
1. Go to the notifications section
2. Click **Send Test Notification**
3. Select a notification type
4. Check your server logs

## Deployment

### Using a Public URL (ngrok for development)

For local testing, expose your server using ngrok:

```bash
ngrok http 3000
```

Use the ngrok URL in App Store Connect (e.g., `https://abc123.ngrok.io/appstore/notifications`)

### Production Deployment

Deploy to any Node.js hosting platform:
- **Heroku**: `git push heroku main`
- **Railway**: Connect GitHub repo
- **DigitalOcean**: Use App Platform
- **AWS**: Elastic Beanstalk or Lambda
- **Google Cloud**: Cloud Run or App Engine

Make sure your production server:
- Uses HTTPS (required by Apple)
- Has a valid SSL certificate
- Is publicly accessible
- Responds within 30 seconds

## Customization

The `handleNotification()` function in `server.js` contains TODO comments where you should add your business logic:

```javascript
case 'SUBSCRIBED':
  console.log('✓ New subscription started');
  // TODO: Add logic to activate user's subscription in your database
  break;
```

Common integrations:
- Save to database (PostgreSQL, MongoDB, etc.)
- Send user notifications (email, push, SMS)
- Update user access/permissions
- Trigger webhooks to other services
- Log to analytics

## Security

- JWT signatures are verified using Apple's public keys
- Keys are cached for 24 hours and automatically rotated
- Invalid signatures return 401 Unauthorized
- Errors still return 200 to prevent Apple retries

## Logs

The server logs detailed information about each notification:
- Notification type and subtype
- Transaction details
- Renewal information
- Processing status

## Troubleshooting

### "Invalid signature" errors
- Ensure you're using the correct Apple environment (Production vs Sandbox)
- Check that the signedPayload is not modified
- Verify network connectivity to Apple's JWKS endpoint

### Notifications not arriving
- Verify the URL in App Store Connect is correct and publicly accessible
- Check that your server is using HTTPS in production
- Ensure your server responds with status 200
- Check firewall rules

### Testing locally
- Use ngrok or similar to expose your local server
- Send test notifications from App Store Connect
- Check server logs for detailed processing information

## Resources

- [App Store Server Notifications V2](https://developer.apple.com/documentation/appstoreservernotifications)
- [App Store Server API](https://developer.apple.com/documentation/appstoreserverapi)
- [In-App Purchase Best Practices](https://developer.apple.com/documentation/storekit/in-app_purchase)

## License

ISC
