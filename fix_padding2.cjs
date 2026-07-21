const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace('right: 12px; pointer-events: none;', 'right: 16px; pointer-events: none;');
html = html.replace('padding-right: 32px;', 'padding-right: 40px; padding-left: 16px;');

fs.writeFileSync('index.html', html);
