const axios = require('axios');
const assert = require('assert');

const API_BASE_URL = 'http://localhost:5000/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// In-memory simulation of client.ts token & storage state
let inMemoryToken = null;
let inMemoryUser = null;
let unauthorizedCallbackFired = false;

function setActiveToken(token) {
  inMemoryToken = token;
  if (token) {
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common['Authorization'];
  }
}

function clearSession() {
  setActiveToken(null);
  inMemoryUser = null;
}

client.interceptors.request.use((config) => {
  if (inMemoryToken) {
    config.headers.Authorization = `Bearer ${inMemoryToken}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      clearSession();
      unauthorizedCallbackFired = true;
    }
    return Promise.reject(err);
  }
);

async function runTests() {
  console.log('\n======================================================');
  console.log('  TESTING MOBILE AUTHENTICATION & SESSION LIFECYCLE   ');
  console.log('======================================================\n');

  // TEST 1: Admin Login
  console.log('1. Testing Admin Login (admin / admin123)...');
  const adminRes = await client.post('/auth/login', { username: 'admin', password: 'admin123' });
  const adminData = adminRes.data?.data || adminRes.data;
  assert(adminData.token, 'Token must be returned for Admin');
  assert.strictEqual(adminData.user.role?.code || adminData.user.roleCode, 'ADMIN');
  const adminToken = adminData.token;
  setActiveToken(adminToken);
  inMemoryUser = adminData.user;
  console.log('   ✅ Admin successfully authenticated with role: ADMIN');
  console.log('   ✅ Active permissions count:', adminData.user.permissions?.length || 0);

  // Verify /auth/me with Admin token
  const adminMe = await client.get('/auth/me');
  const meData = adminMe.data?.data || adminMe.data;
  assert.strictEqual(meData.username, 'admin');
  assert.strictEqual(meData.role?.code || meData.roleCode, 'ADMIN');
  console.log('   ✅ /auth/me verified: current session is ADMIN');

  // TEST 2: Admin Logout & State Clear
  console.log('\n2. Testing Admin Logout & Session Wiping...');
  clearSession();
  assert.strictEqual(inMemoryToken, null, 'inMemoryToken must be null after logout');
  assert.strictEqual(inMemoryUser, null, 'inMemoryUser must be null after logout');
  assert.strictEqual(client.defaults.headers.common['Authorization'], undefined, 'Axios auth header must be deleted');
  console.log('   ✅ Admin session wiped cleanly. Token & user are NULL.');

  // TEST 3: Security Guard Login & Role Transition
  console.log('\n3. Testing Account Switch: Security Guard Login (guard / guard123)...');
  const guardRes = await client.post('/auth/login', { username: 'guard', password: 'guard123' });
  const guardData = guardRes.data?.data || guardRes.data;
  assert(guardData.token, 'Token must be returned for Guard');
  assert.notStrictEqual(guardData.token, adminToken, 'Guard token must be different from Admin token');
  assert.strictEqual(guardData.user.role?.code || guardData.user.roleCode, 'SECURITY_GUARD');
  const guardToken = guardData.token;
  setActiveToken(guardToken);
  inMemoryUser = guardData.user;
  console.log('   ✅ Security Guard authenticated with role: SECURITY_GUARD');
  console.log('   ✅ Guard has distinct token from previous Admin token');

  // Verify /auth/me reflects Guard
  const guardMe = await client.get('/auth/me');
  const guardMeData = guardMe.data?.data || guardMe.data;
  assert.strictEqual(guardMeData.username, 'guard');
  assert.strictEqual(guardMeData.role?.code || guardMeData.roleCode, 'SECURITY_GUARD');
  console.log('   ✅ /auth/me verified: current session is SECURITY_GUARD (No Admin leakage)');

  // TEST 4: Security Guard Logout
  console.log('\n4. Testing Security Guard Logout...');
  clearSession();
  assert.strictEqual(inMemoryToken, null);
  assert.strictEqual(inMemoryUser, null);
  console.log('   ✅ Security Guard session wiped cleanly.');

  // TEST 5: Manager Login & Role Transition
  console.log('\n5. Testing Account Switch: Manager Login (manager / manager123)...');
  const mgrRes = await client.post('/auth/login', { username: 'manager', password: 'manager123' });
  const mgrData = mgrRes.data?.data || mgrRes.data;
  assert(mgrData.token, 'Token must be returned for Manager');
  assert.strictEqual(mgrData.user.role?.code || mgrData.user.roleCode, 'MANAGER');
  setActiveToken(mgrData.token);
  inMemoryUser = mgrData.user;
  console.log('   ✅ Manager authenticated with role: MANAGER');

  // Verify /auth/me reflects Manager
  const mgrMe = await client.get('/auth/me');
  const mgrMeData = mgrMe.data?.data || mgrMe.data;
  assert.strictEqual(mgrMeData.username, 'manager');
  assert.strictEqual(mgrMeData.role?.code || mgrMeData.roleCode, 'MANAGER');
  console.log('   ✅ /auth/me verified: current session is MANAGER (No Guard/Admin leakage)');

  // TEST 6: Manager Logout
  console.log('\n6. Testing Manager Logout...');
  clearSession();
  assert.strictEqual(inMemoryToken, null);
  assert.strictEqual(inMemoryUser, null);
  console.log('   ✅ Manager session wiped cleanly.');

  // TEST 7: Rapid Sequential Account Switching (Admin -> Guard -> Manager -> Admin)
  console.log('\n7. Testing Rapid Sequential Account Switching Loop...');
  const switchAccounts = [
    { u: 'admin', p: 'admin123', role: 'ADMIN' },
    { u: 'guard', p: 'guard123', role: 'SECURITY_GUARD' },
    { u: 'manager', p: 'manager123', role: 'MANAGER' },
    { u: 'admin', p: 'admin123', role: 'ADMIN' },
  ];

  for (const acc of switchAccounts) {
    const res = await client.post('/auth/login', { username: acc.u, password: acc.p });
    const d = res.data?.data || res.data;
    setActiveToken(d.token);
    inMemoryUser = d.user;
    assert.strictEqual(d.user.role?.code || d.user.roleCode, acc.role);
    console.log(`   🔄 Switch → ${acc.role} (${acc.u}) verified OK`);
    clearSession();
  }
  console.log('   ✅ All role transitions succeeded without state pollution!');

  // TEST 8: 401 Session Invalidation
  console.log('\n8. Testing 401 Unauthorized Interceptor Trigger...');
  unauthorizedCallbackFired = false;
  setActiveToken('invalid_expired_dummy_jwt_token_12345');
  try {
    await client.get('/auth/me');
    assert.fail('Request with invalid token should fail with 401');
  } catch (e) {
    assert.strictEqual(e.response?.status, 401, 'Should return 401');
    assert.strictEqual(unauthorizedCallbackFired, true, 'Unauthorized callback must be triggered on 401');
    assert.strictEqual(inMemoryToken, null, 'Token must be wiped on 401');
    assert.strictEqual(inMemoryUser, null, 'User must be wiped on 401');
    console.log('   ✅ 401 correctly wiped stored session & fired callback');
  }

  console.log('\n======================================================');
  console.log('  🎉 ALL AUTHENTICATION & SWITCHING TESTS PASSED!     ');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test failure:', err.message);
  process.exit(1);
});
