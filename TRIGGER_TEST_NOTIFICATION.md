# How to Trigger Test Notifications Programmatically

This guide shows you how to trigger App Store Server Notifications **on demand** using Apple's App Store Server API.

## Prerequisites

You need an **App Store Connect API Key** with proper permissions.

### Step 1: Create API Key in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **Users and Access** → **Integrations** → **Keys** (App Store Connect API)
3. Click **"+"** to generate a new key
4. Give it a name (e.g., "Test Notification API")
5. Select role: **Admin** or **App Manager**
6. Click **Generate**
7. **Download the `.p8` file** (you can only download it once!)
8. Note down:
   - **Issuer ID** (top of the page, looks like: `57246542-96fe-1a63-e053-0824d011072a`)
   - **Key ID** (in the key row, looks like: `2X9R4HXF34`)

### Step 2: Setup Configuration

1. **Move the `.p8` file** to your project root:
   ```bash
   mv ~/Downloads/AuthKey_2X9R4HXF34.p8 ./AuthKey.p8
   ```

2. **Update your `.env` file** with the API credentials:
   ```bash
   APPLE_ISSUER_ID=57246542-96fe-1a63-e053-0824d011072a
   APPLE_KEY_ID=2X9R4HXF34
   APPLE_BUNDLE_ID=com.yourcompany.yourapp
   APPLE_PRIVATE_KEY_PATH=./AuthKey.p8
   APPLE_ENVIRONMENT=sandbox
   ```

   - `APPLE_ISSUER_ID`: From App Store Connect > Users and Access > Keys (top of page)
   - `APPLE_KEY_ID`: The Key ID from your API key
   - `APPLE_BUNDLE_ID`: Your app's bundle identifier
   - `APPLE_PRIVATE_KEY_PATH`: Path to your `.p8` file
   - `APPLE_ENVIRONMENT`: `sandbox` for testing, `production` for live

### Step 3: Trigger a Test Notification

**Make sure your server is running:**
```bash
npm run dev
```

**In another terminal, run:**
```bash
npm run test:notification
```

You should see:
```
🚀 Requesting test notification from Apple...

📝 Generating JWT token...
✓ JWT token generated

📡 Sending request to: https://api.storekit-sandbox.itunes.apple.com/inApps/v1/notifications/test
   Environment: sandbox
   Bundle ID: com.yourcompany.yourapp

✅ Test notification requested successfully!

Response: {
  "testNotificationToken": "ce3af791-365e-4c60-841b-1674b43c6b83_1735689600"
}

📬 Apple will send a TEST notification to your configured webhook URL.
   Check your server logs for the incoming notification.
```

**Within a few seconds**, check your server logs and you should see:
```
Received notification from App Store
✓ JWT signature verified
Notification Type: TEST
✓ Discord webhook called successfully
```

## Troubleshooting

### Error: "Missing required configuration"
- Make sure all environment variables are set in `.env`
- Double-check the variable names match exactly

### Error: "Private key file not found"
- Verify the `.p8` file exists at the path specified in `APPLE_PRIVATE_KEY_PATH`
- Check file permissions (should be readable)

### Error: 401 Unauthorized
- Verify `ISSUER_ID` and `KEY_ID` are correct
- Make sure the API key hasn't been revoked
- Check that the `.p8` file is the correct one

### Error: 404 Not Found
- Verify `BUNDLE_ID` matches your app in App Store Connect
- Make sure you're using the correct environment (`sandbox` vs `production`)
- Ensure the app exists in App Store Connect

### No notification received on server
- Check that your webhook URL is configured in App Store Connect
- Verify your server is publicly accessible
- Make sure your server is running
- Check for firewall issues

## Environment: Sandbox vs Production

**Sandbox** (`APPLE_ENVIRONMENT=sandbox`):
- For testing during development
- Uses sandbox App Store Connect data
- Endpoint: `https://api.storekit-sandbox.itunes.apple.com`

**Production** (`APPLE_ENVIRONMENT=production`):
- For live apps
- Uses real production data
- Endpoint: `https://api.storekit.itunes.apple.com`

## Security Notes

⚠️ **IMPORTANT:**
- **NEVER commit your `.p8` private key file to git**
- Add `*.p8` to your `.gitignore`
- Keep your `ISSUER_ID` and `KEY_ID` secret
- Store credentials securely in production (use environment variables, secrets manager, etc.)

## Check Notification Status

After triggering a test notification, you can check its status:

```bash
# Get the testNotificationToken from the response
TOKEN="ce3af791-365e-4c60-841b-1674b43c6b83_1735689600"

# For sandbox
curl -H "Authorization: Bearer <YOUR_JWT>" \
  https://api.storekit-sandbox.itunes.apple.com/inApps/v1/notifications/test/$TOKEN
```

## References

- [Request a Test Notification - Apple Documentation](https://developer.apple.com/documentation/appstoreserverapi/request-a-test-notification)
- [Get Test Notification Status - Apple Documentation](https://developer.apple.com/documentation/appstoreserverapi/get-test-notification-status)
- [App Store Server API - Apple Documentation](https://developer.apple.com/documentation/appstoreserverapi)
