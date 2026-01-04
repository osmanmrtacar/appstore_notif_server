// Quick script to decode JWT header and payload
const token = process.argv[2];

if (!token) {
  console.error('Usage: node decode-jwt.js <jwt-token>');
  process.exit(1);
}

const parts = token.split('.');
const header = JSON.parse(Buffer.from(parts[0], 'base64').toString('utf8'));
const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));

console.log('\n📋 JWT Header:');
console.log(JSON.stringify(header, null, 2));

console.log('\n📦 JWT Payload:');
console.log(JSON.stringify(payload, null, 2));
