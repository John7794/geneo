const fs = require('fs');
let code = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

code = code.replace(/\.analytics-header-left h1 \{[\s\S]*?\}/, `.analytics-header-left h1 {
    font-size: clamp(16px, 5vw, 20px);
    font-weight: bold;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
}`);

fs.writeFileSync('css/components/interaction/analytics.css', code);
console.log("Success");
