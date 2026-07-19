const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');
code = code.replace('li style="display: flex; gap: 16px; padding: 12px;', 'li style="display: flex; padding: 12px;');
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
