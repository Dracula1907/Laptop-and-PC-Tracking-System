const EmbeddedPostgres = require('embedded-postgres').default;
const path = require('path');
const fs = require('fs');

async function startDatabase() {
  const dataDir = path.join(__dirname, '..', '.pgdata');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const pg = new EmbeddedPostgres({
    port: 5432,
    databaseDir: dataDir,
    user: 'itam_user',
    password: 'itam_password_secret',
    database: 'itam_db',
    persistent: true,
  });

  console.log('🔄 Initialising local PostgreSQL database...');
  try {
    await pg.initialise();
  } catch (e) {
    console.log('Database already initialised or notice:', e.message);
  }

  console.log('🚀 Starting PostgreSQL on port 5432...');
  await pg.start();
  console.log('✅ PostgreSQL is running and ready for connections on port 5432!');

  const shutdown = async () => {
    console.log('Stopping PostgreSQL...');
    await pg.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep process alive
  setInterval(() => {}, 1000);
}

startDatabase().catch((err) => {
  console.error('❌ Failed to start PostgreSQL:', err);
  process.exit(1);
});
