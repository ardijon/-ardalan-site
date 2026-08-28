const fs = require('fs');
let sql = fs.readFileSync('.open-next/cloudflare/cache-assets-manifest.sql', 'utf8');
// Replace Windows backslashes with forward slashes for SQLite
sql = sql.split('\\').join('/');
fs.writeFileSync('scripts/d1-tags.sql', sql);
console.log('Fixed SQL written. INSERT statements:', (sql.match(/INSERT/g) || []).length);
