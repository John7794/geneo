const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldLine = `if (val === 'www.johnsel771994@gmail.com' || val === 'test') {`;
const newLine = `if (val === 'www.johnsel771994@gmail.com') {`;

code = code.replace(oldLine, newLine);
fs.writeFileSync('server.ts', code);
console.log('Removed test user access');
