const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
    ".where('value', '==', val)",
    ".where('email', '==', val)"
);

code = code.replace(
    "await fdb.collection('shares').add({\n      value: val,",
    "await fdb.collection('shares').add({\n      email: val,"
);

fs.writeFileSync('server.ts', code);
console.log('Fixed email field in queries');
