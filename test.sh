#!/bin/bash

# Test script for App Store Server Notifications

PORT=${PORT:-3001}
BASE_URL="http://localhost:$PORT"

echo "🧪 Testing App Store Server Notifications"
echo "=========================================="
echo ""

# Test 1: SUBSCRIBED
echo "Test 1: SUBSCRIBED notification"
curl -X POST $BASE_URL/test/notification \
  -H "Content-Type: application/json" \
  -d '{
    "notificationType": "SUBSCRIBED",
    "subtype": "INITIAL_BUY",
    "transactionInfo": {
      "transactionId": "test_sub_001",
      "productId": "com.example.premium",
      "expiresDate": 1735235037000
    },
    "renewalInfo": {
      "autoRenewStatus": 1
    }
  }'
echo -e "\n"
sleep 1

# Test 2: DID_RENEW
echo "Test 2: DID_RENEW notification"
curl -X POST $BASE_URL/test/notification \
  -H "Content-Type: application/json" \
  -d '{
    "notificationType": "DID_RENEW",
    "transactionInfo": {
      "transactionId": "test_renew_002",
      "productId": "com.example.premium.monthly",
      "expiresDate": 1738000000000
    },
    "renewalInfo": {
      "autoRenewStatus": 1
    }
  }'
echo -e "\n"
sleep 1

# Test 3: EXPIRED
echo "Test 3: EXPIRED notification"
curl -X POST $BASE_URL/test/notification \
  -H "Content-Type: application/json" \
  -d '{
    "notificationType": "EXPIRED",
    "subtype": "VOLUNTARY",
    "transactionInfo": {
      "transactionId": "test_exp_003",
      "productId": "com.example.premium.yearly",
      "expiresDate": 1735235037000
    },
    "renewalInfo": {
      "autoRenewStatus": 0
    }
  }'
echo -e "\n"
sleep 1

# Test 4: DID_FAIL_TO_RENEW with GRACE_PERIOD
echo "Test 4: DID_FAIL_TO_RENEW notification"
curl -X POST $BASE_URL/test/notification \
  -H "Content-Type: application/json" \
  -d '{
    "notificationType": "DID_FAIL_TO_RENEW",
    "subtype": "GRACE_PERIOD",
    "transactionInfo": {
      "transactionId": "test_fail_004",
      "productId": "com.example.premium",
      "expiresDate": 1735235037000
    },
    "renewalInfo": {
      "autoRenewStatus": 1
    }
  }'
echo -e "\n"
sleep 1

# Test 5: REFUND
echo "Test 5: REFUND notification"
curl -X POST $BASE_URL/test/notification \
  -H "Content-Type: application/json" \
  -d '{
    "notificationType": "REFUND",
    "transactionInfo": {
      "transactionId": "test_refund_005",
      "productId": "com.example.premium",
      "expiresDate": 1735235037000
    }
  }'
echo -e "\n"
sleep 1

# Test 6: DID_CHANGE_RENEWAL_STATUS
echo "Test 6: DID_CHANGE_RENEWAL_STATUS notification"
curl -X POST $BASE_URL/test/notification \
  -H "Content-Type: application/json" \
  -d '{
    "notificationType": "DID_CHANGE_RENEWAL_STATUS",
    "subtype": "AUTO_RENEW_DISABLED",
    "transactionInfo": {
      "transactionId": "test_change_006",
      "productId": "com.example.premium",
      "expiresDate": 1735235037000
    },
    "renewalInfo": {
      "autoRenewStatus": 0
    }
  }'
echo -e "\n"

echo ""
echo "=========================================="
echo "✓ All tests completed!"
echo "Check server logs for Discord webhook calls"
