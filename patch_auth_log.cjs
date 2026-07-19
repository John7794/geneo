const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
    "if (!snap.empty) {",
    "console.log('Query result for', val, 'empty:', snap.empty);\n      if (!snap.empty) {"
);

fs.writeFileSync('server.ts', code);
console.log('Added log');
