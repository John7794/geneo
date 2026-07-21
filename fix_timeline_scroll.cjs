const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');
code = code.replace(/targetEl\.scrollIntoView\(\{ behavior: 'smooth' \}\);/g, "targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });");
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
