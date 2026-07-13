const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

js = js.replace(/background: var\(--color-primary\)/g, 'background: var(--color-border)');
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
console.log("Colors fixed.");
