const fs = require('fs');
const meta = JSON.parse(fs.readFileSync('data/db/metadata.json', 'utf8'));
meta.timestamp = Date.now();
meta.lastUpdated = new Date().toISOString();
fs.writeFileSync('data/db/metadata.json', JSON.stringify(meta, null, 2));
