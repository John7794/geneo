const fs = require('fs');
let js = fs.readFileSync('scripts/api/dataLoader.js', 'utf8');

js = js.replace(
    'header: true,',
    'header: true,\n\t\t\t\ttransformHeader: (h) => h.trim().replace(/^\\uFEFF/, ""),'
);

fs.writeFileSync('scripts/api/dataLoader.js', js);
console.log("Fixed dataLoader");
