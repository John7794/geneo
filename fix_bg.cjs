const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

code = code.replace(/background: var\(--color-bg\);/g, `background: var(--color-bg-body);`);

fs.writeFileSync('index.html', code);
console.log("Success fixing color bg");
