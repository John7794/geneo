const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(/model: "gemini-[^"]+"/, 'model: "gemini-3.5-flash"');
fs.writeFileSync('server.ts', code);
