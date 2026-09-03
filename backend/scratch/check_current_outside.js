const http = require('http');

async function main() {
  const loginRes = await new Promise(resolve => {
    const req = http.request('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.write(JSON.stringify({ username: 'admin', password: 'admin123' }));
    req.end();
  });

  const token = loginRes.data.token;

  const outside = await new Promise(resolve => {
    http.get('http://localhost:5000/api/security-gate/current-outside', {
      headers: { Authorization: 'Bearer ' + token },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
  });

  console.log('CURRENT OUTSIDE API RESPONSE:\n', JSON.stringify(outside, null, 2));
}

main().catch(console.error);
