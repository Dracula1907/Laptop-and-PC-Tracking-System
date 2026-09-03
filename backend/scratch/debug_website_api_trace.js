const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:5000/api';

function apiRequest({ method = 'GET', path, token, body }) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  // Login as admin
  const login = await apiRequest({
    method: 'POST',
    path: '/auth/login',
    body: { username: 'admin', password: 'admin123' },
  });
  const token = login.body?.data?.token;

  // Find asset FAA-021
  const asset = await prisma.asset.findFirst({
    where: { assetCode: 'FAA-021' },
  });
  console.log('Target Asset FAA-021 ID:', asset?.id);

  console.log('\n--- 1. GET /security-gate/kpis ---');
  const kpis = await apiRequest({ path: '/security-gate/kpis', token });
  console.log('KPIs:', JSON.stringify(kpis.body, null, 2));

  console.log('\n--- 2. GET /security-gate/current-outside ---');
  const outside = await apiRequest({ path: '/security-gate/current-outside', token });
  console.log('Current Outside:', JSON.stringify(outside.body, null, 2));

  console.log('\n--- 3. GET /security-gate/history ---');
  const history = await apiRequest({ path: '/security-gate/history?limit=5', token });
  console.log('Gate History (top 5):', JSON.stringify(history.body, null, 2));

  console.log('\n--- 4. GET /assets/' + asset?.id + ' ---');
  const assetDetail = await apiRequest({ path: `/assets/${asset?.id}`, token });
  console.log('Asset gatePresence:', assetDetail.body?.data?.gatePresence);
  console.log('Asset status:', assetDetail.body?.data?.status);
  console.log('Asset allocationStatus:', assetDetail.body?.data?.allocationStatus);

  console.log('\n--- 5. GET /assets/' + asset?.id + '/history ---');
  const assetHist = await apiRequest({ path: `/assets/${asset?.id}/history`, token });
  console.log('Asset History count:', assetHist.body?.data?.events?.length);
  console.log('Asset History events:', JSON.stringify(assetHist.body?.data?.events, null, 2));

  console.log('\n--- 6. GET /assets/' + asset?.id + '/history/summary ---');
  const summary = await apiRequest({ path: `/assets/${asset?.id}/history/summary`, token });
  console.log('Asset History Summary:', JSON.stringify(summary.body, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
