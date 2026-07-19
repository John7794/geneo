const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

// Update places inner list
code = code.replace(
    /padding: 6px 12px; background: var\(--color-bg-card\); border: 1px solid var\(--color-border-light\); border-radius: 6px;/g,
    'padding: 12px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 8px; list-style: none;'
);

code = code.replace(
    /gap: 4px;/g,
    'gap: 8px;'
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
