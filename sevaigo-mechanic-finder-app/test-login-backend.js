const http = require('http');
const { app } = require('./server');

const TEST_PORT = 5055;

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const req = http.request(
      {
        hostname: 'localhost',
        port: TEST_PORT,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 Starting Automated Tests for Login Backend');
  console.log('======================================================\n');

  const server = app.listen(TEST_PORT);

  try {
    // 1. Health Check
    console.log('1️⃣ Testing GET /api/health...');
    const health = await request('GET', '/api/health');
    console.log('   Response Status:', health.status);
    console.log('   Database:', health.body.database);
    if (health.status !== 200) throw new Error('Health check failed');
    console.log('   ✅ Health check passed!\n');

    // 2. User Registration
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'SecurePassword123!';
    console.log(`2️⃣ Testing POST /api/register with email: ${testEmail}...`);
    const regRes = await request('POST', '/api/register', {
      email: testEmail,
      password: testPassword,
    });
    console.log('   Response Status:', regRes.status);
    console.log('   Registered User ID:', regRes.body.user?.id);
    if (regRes.status !== 201 || !regRes.body.user?.id) throw new Error('Registration failed');
    console.log('   ✅ Registration passed!\n');

    // 3. Duplicate Registration Prevention
    console.log('3️⃣ Testing Duplicate Registration Prevention...');
    const dupRes = await request('POST', '/api/register', {
      email: testEmail,
      password: testPassword,
    });
    console.log('   Response Status (expect 409):', dupRes.status);
    if (dupRes.status !== 409) throw new Error('Duplicate prevention failed');
    console.log('   ✅ Duplicate prevention passed!\n');

    // 4. Login with Wrong Password
    console.log('4️⃣ Testing Login with Wrong Password...');
    const wrongLogin = await request('POST', '/api/login', {
      email: testEmail,
      password: 'wrong_password',
    });
    console.log('   Response Status (expect 401):', wrongLogin.status);
    if (wrongLogin.status !== 401) throw new Error('Password verification check failed');
    console.log('   ✅ Wrong password rejected correctly!\n');

    // 5. Login with Correct Password
    console.log('5️⃣ Testing Login with Correct Password...');
    const loginRes = await request('POST', '/api/login', {
      email: testEmail,
      password: testPassword,
    });
    console.log('   Response Status:', loginRes.status);
    console.log('   Login Message:', loginRes.body.message);
    if (loginRes.status !== 200 || loginRes.body.user?.email !== testEmail) throw new Error('Login failed');
    console.log('   ✅ Login passed!\n');

    // 6. List Users
    console.log('6️⃣ Testing GET /api/users...');
    const usersRes = await request('GET', '/api/users');
    console.log('   Total Users in Database:', usersRes.body.count);
    if (usersRes.status !== 200 || !Array.isArray(usersRes.body.users)) throw new Error('Listing users failed');
    console.log('   ✅ Users list passed!\n');

    // 7. Test MySQL db.js import
    console.log('7️⃣ Testing MySQL db.js module loading...');
    const { pool } = require('./db');
    if (!pool) throw new Error('MySQL pool export missing');
    console.log('   ✅ MySQL db.js module loaded and configured!\n');

    console.log('======================================================');
    console.log('🎉 ALL BACKEND TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runTests();
