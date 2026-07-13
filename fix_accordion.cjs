const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

js = js.replace(
    "parentSec.style.display = 'block';",
    "parentSec.style.display = 'block';\n                                 parentSec.classList.add('accordion-open');"
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
console.log("Fixed accordion logic");
