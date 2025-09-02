// Simple script to generate favicon.ico from public/favicon.ico.png
// Requires png-to-ico: npm install --save-dev png-to-ico

const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const srcPng = path.resolve(__dirname, '..', 'public', 'favicon.ico.png');
    const outIco = path.resolve(__dirname, '..', 'public', 'favicon.ico');

    if (!fs.existsSync(srcPng)) {
      console.error('Source PNG not found at', srcPng);
      process.exit(1);
    }

    const pngToIco = (await import('png-to-ico')).default;
    const buf = await pngToIco(srcPng);
    fs.writeFileSync(outIco, buf);
    console.log('Generated', outIco);
  } catch (e) {
    console.error('Failed to generate favicon:', e);
    process.exit(1);
  }
})();
