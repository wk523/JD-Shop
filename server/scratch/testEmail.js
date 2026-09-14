const { sendTestEmail } = require('../src/services/emailService');

async function test() {
  console.log('Sending test email via Mailtrap sandbox...');
  const res = await sendTestEmail('a_test_user@example.com');
  console.log('Result:', res);
  process.exit(0);
}

test();
