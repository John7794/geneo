const fs = require('fs');
let code = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

code = code.replace(/\.analytics-view \{[\s\S]*?\}/, `.analytics-view {
    width: 100%;
    overflow-x: clip;
}`);

fs.writeFileSync('css/components/interaction/analytics.css', code);
console.log("Success");
