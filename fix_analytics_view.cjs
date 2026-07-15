const fs = require('fs');
let code = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

code = code.replace(/\.analytics-view\s*\{[\s\S]*?\}/, `.analytics-view {
    width: 100%;
    /* Removed height: 100% and overflow-y: auto to allow window scroll and fix sticky */
}`);

fs.writeFileSync('css/components/interaction/analytics.css', code);
console.log("Success fix analytics-view");
