const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldHeader = `<li id="timeline-century-\${currentCentury}" style="list-style: none; margin-top: 24px; margin-bottom: 16px; display: flex; align-items: center; width: 100%; position: sticky; top: -16px; background: var(--color-bg-body); z-index: 10; padding: 12px 0;">`;
const newHeader = `<li id="timeline-century-\${currentCentury}" style="list-style: none; margin-top: 24px; margin-bottom: 16px; display: flex; align-items: center; width: 100%; padding: 12px 0;">`;

code = code.replace(oldHeader, newHeader);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
