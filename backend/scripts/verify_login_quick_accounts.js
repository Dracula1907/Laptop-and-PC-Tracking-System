const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:5000/api';

async function request(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function verify() {
  console.log('================================================================');
  console.log('VERIFYING ALL DEVELOPMENT QUICK ACCOUNTS (LOGIN & AUTH & RBAC)');
  console.log('================================================================\n');

  const accounts = [
    { name: 'ADMIN', username: 'admin', password: 'admin123', expectedRole: 'ADMIN' },
    { name: 'MANAGER', username: 'manager', password: 'manager123', expectedRole: 'MANAGER' },
    { name: 'DIRECTOR', username: 'director', password: 'director123', expectedRole: 'DIRECTOR' },
    { name: 'SECURITY GUARD', username: 'guard', password: 'guard123', expectedRole: 'SECURITY_GUARD' },
    { name: 'IT STAFF', username: 'it', password: 'it123', expectedRole: 'IT' },
    { name: 'USER', username: 'user', password: 'user123', expectedRole: 'USER' },
  ];

  for (const acc of accounts) {
    const res = await request('/auth/login', {
      username: acc.username,
      password: acc.password,
    });

    if (res.status !== 200 || !res.data?.success) {
      throw new Error(`Login failed for ${acc.name} (${acc.username}): ${JSON.stringify(res.data)}`);
    }

    const userData = res.data.data.user;
    const token = res.data.data.token;
    const roleCode = userData.role?.code || userData.roleCode;

    if (roleCode !== acc.expectedRole) {
      throw new Error(`Role mismatch for ${acc.name}: expected ${acc.expectedRole}, got ${roleCode}`);
    }

    // Verify /auth/me with token
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meData = await meRes.json();
    const meRoleCode = meData.data?.role?.code || meData.data?.roleCode;

    if (meRoleCode !== acc.expectedRole) {
      throw new Error(`/auth/me role mismatch for ${acc.name}: expected ${acc.expectedRole}, got ${meRoleCode}`);
    }

    console.log(`✓ ${acc.name.padEnd(15)} (${acc.username} / ${acc.password}) -> Login 200 OK | Role: ${roleCode} | Me endpoint verified`);
  }

  console.log('\n================================================================');
  console.log('ALL 6 DEVELOPMENT ACCOUNTS AUTHENTICATE AND PRESERVE RBAC!');
  console.log('================================================================');
}

verify()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
