const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
    "} catch(e) {}",
    "} catch(e) { console.error('Firebase shares query error:', e); }"
);

fs.writeFileSync('server.ts', code);
console.log('Fixed error logging');
