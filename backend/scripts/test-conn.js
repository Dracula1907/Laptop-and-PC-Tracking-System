const { Client } = require('pg');

async function test() {
  const tryConnections = [
    'postgresql://postgres:postgres@localhost:5432/postgres',
    'postgresql://itam_user:itam_password_secret@localhost:5432/itam_db',
    'postgresql://itam_user:itam_password_secret@localhost:5432/postgres',
    'postgresql://postgres:@localhost:5432/postgres',
  ];

  for (const url of tryConnections) {
    const client = new Client({ connectionString: url });
    try {
      await client.connect();
      console.log('✅ Connected successfully with:', url);
      const res = await client.query('SELECT current_user, current_database()');
      console.log('User and DB:', res.rows[0]);
      await client.end();
      return;
    } catch (e) {
      console.log('Failed', url, '->', e.message);
    }
  }
}

test();
