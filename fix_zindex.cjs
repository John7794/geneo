const fs = require('fs');

let cssCode = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');
cssCode = cssCode.replace(/\.events-sidebar-desktop\s*\{[\s\S]*?z-index:\s*10;/g, match => match.replace('z-index: 10;', 'z-index: 15;'));
fs.writeFileSync('css/components/interaction/analytics.css', cssCode);
