const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(/([^\}])\s+catch/g, '$1\n    } catch');
fs.writeFileSync('server.ts', code);
