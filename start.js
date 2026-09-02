const { spawn, execSync } = require('child_process');
const http = require('http');
const net = require('net');
const path = require('path');

function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForPort(port, name, maxRetries = 30) {
  process.stdout.write(`Waiting for ${name} on port ${port}...`);
  for (let i = 0; i < maxRetries; i++) {
    const open = await isPortOpen(port);
    if (open) {
      console.log(` Ready!`);
      return true;
    }
    process.stdout.write('.');
    await wait(1000);
  }
  console.log(` Timeout!`);
  return false;
}

async function main() {
  console.log('\n========================================================');
  console.log('  Starting Laptop & IT Asset Tracking Management System ');
  console.log('========================================================\n');

  // 1. Check PostgreSQL on 5432
  const dbRunning = await isPortOpen(5432);
  if (!dbRunning) {
    console.log('📦 Starting local embedded PostgreSQL...');
    const dbProcess = spawn('node', ['scripts/start-db.js'], {
      cwd: path.join(__dirname, 'backend'),
      stdio: 'inherit',
      shell: true,
    });
    await waitForPort(5432, 'PostgreSQL');
  } else {
    console.log('✅ PostgreSQL is already running on port 5432');
  }

  // 2. Check Backend on 5000
  const backendRunning = await isPortOpen(5000);
  if (!backendRunning) {
    console.log('🚀 Starting Backend server (port 5000)...');
    spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, 'backend'),
      stdio: 'inherit',
      shell: true,
    });
    await waitForPort(5000, 'Backend API');
  } else {
    console.log('✅ Backend API is already running on port 5000');
  }

  // 3. Check Frontend on 3000
  const frontendRunning = await isPortOpen(3000);
  if (!frontendRunning) {
    console.log('🌐 Starting Frontend dev server (port 3000)...');
    spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, 'frontend'),
      stdio: 'inherit',
      shell: true,
    });
    await waitForPort(3000, 'Frontend UI');
  } else {
    console.log('✅ Frontend UI is already running on port 3000');
  }

  console.log('\n========================================================');
  console.log('  🎉 All services are online!');
  console.log('  💻 Web App:     http://localhost:3000');
  console.log('  🔌 Backend API: http://localhost:5000/api');
  console.log('  🔑 Admin Login: admin / admin123');
  console.log('========================================================\n');

  // Open browser in Windows
  try {
    const startCmd = process.platform === 'win32' ? 'start http://localhost:3000' : 'open http://localhost:3000';
    execSync(startCmd);
  } catch (e) {
    // ignore if browser cannot be launched
  }
}

main().catch(console.error);
