const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
    "if (val === 'www.johnsel771994@gmail.com') {",
    "if (val === 'www.johnsel771994@gmail.com' || val === 'johnsel771994@gmail.com') {"
);

fs.writeFileSync('server.ts', code);
console.log('Fixed email auth check');
