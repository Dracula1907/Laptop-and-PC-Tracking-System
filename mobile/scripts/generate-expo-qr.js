const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const url = 'exp://192.168.1.7:8081';
const artifactDir = 'C:\\Users\\Omkar Satpute\\.gemini\\antigravity-ide\\brain\\20589644-421e-40f8-b271-208c0af605dd';
const pngPath = path.join(artifactDir, 'expo_qr.png');
const localPng = path.join(__dirname, '..', 'expo_qr.png');

async function main() {
  // 1. Generate Terminal String
  const string = await QRCode.toString(url, { type: 'terminal', small: true });
  console.log('================= EXPO GO QR CODE =================');
  console.log(string);
  console.log('===================================================');
  console.log('Expo Go URL: ' + url);

  // 2. Generate PNG Image in artifacts
  await QRCode.toFile(pngPath, url, {
    width: 360,
    margin: 2,
    color: {
      dark: '#0A0D14',
      light: '#FFFFFF'
    }
  });

  // Also save in local mobile folder
  await QRCode.toFile(localPng, url, {
    width: 360,
    margin: 2,
    color: {
      dark: '#0A0D14',
      light: '#FFFFFF'
    }
  });

  console.log('Generated PNG QR at: ' + pngPath);
}

main().catch(console.error);
