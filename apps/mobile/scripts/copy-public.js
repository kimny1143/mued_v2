const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const distDir = path.join(__dirname, '..', 'dist');

// Files to copy from public to dist
const filesToCopy = [
  'manifest.json',
  'service-worker.js',
  'register-sw.js',
  'icon-192.png',
  'icon-512.png'
];

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy files
filesToCopy.forEach(file => {
  const src = path.join(publicDir, file);
  const dest = path.join(distDir, file);
  
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${file} to dist/`);
  } else {
    console.warn(`Warning: ${file} not found in public/`);
  }
});

// Update index.html to include manifest and service worker
const indexPath = path.join(distDir, 'index.html');
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');
  
  // Add manifest link if not present
  if (!html.includes('manifest.json')) {
    html = html.replace(
      '</head>',
      '  <link rel="manifest" href="/manifest.json" />\n</head>'
    );
  }
  
  // Add service worker registration if not present
  if (!html.includes('register-sw.js')) {
    html = html.replace(
      '</body>',
      '  <script src="/register-sw.js"></script>\n</body>'
    );
  }
  
  fs.writeFileSync(indexPath, html);
  console.log('Updated index.html with PWA features');
}