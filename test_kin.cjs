const fs = require('fs');
const idx = JSON.parse(fs.readFileSync('data/kinshipIndex.json', 'utf8'));
console.log("56 m_map:", idx['56']?.m_map);
