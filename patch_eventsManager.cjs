const fs = require('fs');
const file = 'scripts/components/interaction/eventsManager.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/renderPersonTile\(evt\.person, this\.context, "", false\)/g, 'renderPersonTile(evt.person, this.context, "", false, { eventType: evt.type })');
content = content.replace(/renderPersonTile\(evt\.spouse, this\.context, "", false\)/g, 'renderPersonTile(evt.spouse, this.context, "", false, { eventType: evt.type })');

fs.writeFileSync(file, content);
console.log('Patched eventsManager.js');
