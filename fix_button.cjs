const fs = require('fs');
let code = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

code = code.replace(/\.analytics-header button i \{[\s\S]*?\}/, `.analytics-header button {
    flex-shrink: 0;
}
.analytics-header button i {
    font-size: 24px;
}`);

fs.writeFileSync('css/components/interaction/analytics.css', code);
console.log("Success");
