const { Client } = require('pg');

async function createDb() {
  const client = new Client({
    connectionString: 'postgresql://itam_user:itam_password_secret@localhost:5432/postgres',
  });

  await client.connect();
  try {
    await client.query('CREATE DATABASE itam_db');
    console.log('✅ Database itam_db created successfully!');
  } catch (err) {
    if (err.code === '42P04') {
      console.log('ℹ️ Database itam_db already exists.');
    } else {
      console.error('Error creating database:', err);
    }
  } finally {
    await client.end();
  }
}

createDb();
