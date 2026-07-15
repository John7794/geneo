const fs = require('fs');
const file = 'css/components/interaction/analytics.css';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('    overflow-x: clip;', '    /* overflow-x: clip; */');
fs.writeFileSync(file, content);
console.log('Fixed clip');
