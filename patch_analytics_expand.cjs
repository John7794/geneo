const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

code = code.replace(/if \(window\.innerWidth >= 1200\) return;/g, "");

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
console.log('Fixed analyticsManager.js innerWidth blocks');
