const fs = require('fs');

let cssCode = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

cssCode = cssCode.replace(/flex-direction:\s*row-reverse;[\s\n]*justify-content:\s*flex-end;/g, 'flex-direction: row;');

fs.writeFileSync('css/components/interaction/analytics.css', cssCode);
