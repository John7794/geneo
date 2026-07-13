const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');
js = js.replace(/var\(--color-surface\)/g, 'var(--color-bg-card)');
js = js.replace(/var\(--color-bg\)/g, 'var(--color-bg-body)');
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
console.log("Analytics tags fixed.");
