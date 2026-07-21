const fs = require('fs');
let cssCode = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

cssCode = cssCode.replace(/top: 186px;/g, 'top: 176px;');
cssCode = cssCode.replace(/scroll-margin-top: 186px;/g, 'scroll-margin-top: 176px;');

fs.writeFileSync('css/components/interaction/analytics.css', cssCode);
