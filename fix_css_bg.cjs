const fs = require('fs');
let code = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

code = code.replace(/var\(--color-bg\)/g, `var(--color-bg-body)`);

fs.writeFileSync('css/components/interaction/analytics.css', code);
console.log("Success fixing color bg in CSS");
