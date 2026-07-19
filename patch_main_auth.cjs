const fs = require('fs');
let code = fs.readFileSync('scripts/main.js', 'utf8');

code = code.replace(
    "const configRes = await fetch('/api/config');",
    "const configRes = await fetch('/api/config', { headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('auth_token') || '') } });"
);

fs.writeFileSync('scripts/main.js', code);
console.log('Fixed main.js auth fetch');
