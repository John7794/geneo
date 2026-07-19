const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
    /window\.location\.href = '\/';/g,
    "window.location.href = '/?t=' + Date.now();"
);

fs.writeFileSync('server.ts', code);
console.log('Fixed login redirect');
