const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { startServer } = require('../server');

function waitForServer(server, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for server to start')), timeoutMs);
    server.once('listening', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

test('login/logout cycle remains healthy across repeated auth sessions', async () => {
  const server = await startServer(0);
  await waitForServer(server);

  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    for (let i = 0; i < 50; i += 1) {
      const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'sujithagopal158@gmail.com', password: 'Admin@123' })
      });

      const loginBody = await loginResponse.json();
      assert.equal(loginResponse.status, 200, `Login failed on cycle ${i}`);
      assert.equal(loginBody.success, true, `Unexpected login body on cycle ${i}`);
      assert.ok(loginBody.token, `Missing token on cycle ${i}`);

      const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loginBody.token}`
        }
      });

      const logoutBody = await logoutResponse.json();
      assert.equal(logoutResponse.status, 200, `Logout failed on cycle ${i}`);
      assert.equal(logoutBody.success, true, `Unexpected logout body on cycle ${i}`);
    }
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
});
