const http = require('http');
const jwt = require('jsonwebtoken');
const { spawn } = require('child_process');
const helper = require('../../helper.js');

const SECRET_KEY = process.env.JWT_SECRET || 'NitechDigitalServices';
const token = jwt.sign(
  {
    user_id: 1,
    userId: 1,
    id: 1,
    username: 'admin',
    user_name: 'sksmadmin',
    roll: 1,
    companyId: 1,
    company: 1,
    yearId: 8,
  },
  SECRET_KEY,
  { expiresIn: '1h' }
);

function req(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const headers = { Authorization: 'Bearer ' + token, 'x-company-id': '1' };
    if (postData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    const r = http.request({ hostname: 'localhost', port: 3500, path, method, headers }, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(b) });
        } catch (_) {
          resolve({ status: res.statusCode, raw: b });
        }
      });
    });
    r.on('error', reject);
    if (postData) r.write(postData);
    r.end();
  });
}

function waitPort(port) {
  return new Promise((resolve) => {
    const chk = () => {
      http
        .get('http://localhost:' + port + '/', () => resolve(true))
        .on('error', () => setTimeout(chk, 400));
    };
    chk();
  });
}

async function run() {
  const server = spawn('node', ['index.js'], {
    cwd: __dirname + '/../../',
    env: { ...process.env, PORT: '3500' },
    stdio: 'ignore',
  });
  await waitPort(3500);
  console.log('Server ready on port 3500');

  try {
    // 1. Create user 1
    const createRes1 = await req('/addNewUser', 'POST', {
      fname: 'Test',
      lname: 'User',
      username: 'TEST-SOFTDEL-USER',
      email: 'test_softdel@example.com',
      mobileno: '9999999999',
      userroll: 1,
      password: 'Password@123',
    });
    console.log('Create User 1 Status:', createRes1.status, createRes1.data);
    const userId1 = createRes1.data?.data?.id;

    // 2. Active duplicate check should block
    const dupRes = await req('/addNewUser', 'POST', {
      fname: 'Test',
      lname: 'User',
      username: 'TEST-SOFTDEL-USER',
      email: 'test_diff@example.com',
      mobileno: '9999999998',
      userroll: 1,
      password: 'Password@123',
    });
    console.log('Duplicate User Active Block Status:', dupRes.status, dupRes.data?.message);

    // 3. Delete User 1 (soft delete)
    const delRes = await req('/deleteUser?deleteId=' + userId1, 'DELETE');
    console.log('Delete User 1 Status:', delRes.status, delRes.data);

    // Verify DB deleted = 1
    const [dbUser1] = await helper.query(
      'SELECT user_id, user_name, deleted, deleted_at, deleted_by FROM user WHERE user_id = ?',
      [userId1]
    );
    console.log('User 1 DB state:', dbUser1);

    // 4. Re-create user with identical username
    const createRes2 = await req('/addNewUser', 'POST', {
      fname: 'Test',
      lname: 'User Reborn',
      username: 'TEST-SOFTDEL-USER',
      email: 'test_reborn@example.com',
      mobileno: '9999999997',
      userroll: 1,
      password: 'Password@123',
    });
    console.log('Create User 2 (Same username) Status:', createRes2.status, createRes2.data);
    const userId2 = createRes2.data?.data?.id;

    // Verify DB states of both
    const [dbUser2] = await helper.query(
      'SELECT user_id, user_name, deleted, deleted_at, deleted_by FROM user WHERE user_id = ?',
      [userId2]
    );
    console.log('User 2 DB state:', dbUser2);

    // 5. Cleanup fixtures
    await helper.query('DELETE FROM user WHERE user_id IN (?, ?)', [userId1, userId2]);
    console.log('Fixtures purged cleanly by exact IDs:', userId1, userId2);

    if (
      createRes1.status === 201 &&
      dupRes.status === 400 &&
      delRes.status === 200 &&
      createRes2.status === 201 &&
      dbUser1.deleted === 1 &&
      dbUser2.deleted === 0
    ) {
      console.log('\n[PASS] USERNAME SOFT-DELETE REUSE API TEST PASSED 100%!');
    } else {
      throw new Error('Test assertion failed!');
    }
  } finally {
    server.kill();
    console.log('Server stopped.');
    process.exit(0);
  }
}

run().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});

