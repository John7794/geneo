const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

code = code.replace(
    /display: flex; align-items: center; padding: 12px;/g,
    'padding: 12px;'
);

code = code.replace(
    /font-size: 15px; color: var\(--color-text-main\);/g,
    'font-size: 15px; color: var(--color-text-main); line-height: 1.4;'
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
