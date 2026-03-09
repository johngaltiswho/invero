const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// UPI payment string format
const upiId = 'finvernoprivatelimited@sbi';
const payeeName = 'Finverno Private Limited';
const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&cu=INR`;

// Output path
const outputPath = path.join(__dirname, '..', 'public', 'images', 'finverno-upi-qr.png');

// Generate QR code
QRCode.toFile(outputPath, upiString, {
  width: 300,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  }
}, (err) => {
  if (err) {
    console.error('Error generating QR code:', err);
    process.exit(1);
  }
  console.log('✅ UPI QR code generated successfully!');
  console.log(`📁 Saved to: ${outputPath}`);
  console.log(`🔗 UPI String: ${upiString}`);
});
