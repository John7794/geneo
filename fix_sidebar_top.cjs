const fs = require('fs');
let cssCode = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

cssCode = cssCode.replace(/top:\s*140px;/g, 'top: 180px;');
cssCode = cssCode.replace(/max-height:\s*calc\(100vh - 160px\);/g, 'max-height: calc(100vh - 200px);');

fs.writeFileSync('css/components/interaction/analytics.css', cssCode);
