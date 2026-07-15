const fs = require('fs');
const files = ['data/db/uk/places.csv', 'data/db/ru/places.csv', 'data/db/pl/places.csv', 'data/db/krl/places.csv'];

for (const file of files) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        fs.writeFileSync(file, content);
    }
}
// update metadata too
const metaFile = 'data/db/metadata.json';
const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
meta.timestamp = Date.now();
meta.lastUpdated = new Date().toISOString();
fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));

console.log("Success!");
