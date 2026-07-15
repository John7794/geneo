const fs = require('fs');
let code = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

code = code.replace(/z-index: 9;/g, 'z-index: 11;');

fs.writeFileSync('css/components/interaction/analytics.css', code);
console.log("Success changing z-index");
