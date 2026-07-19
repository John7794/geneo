const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

code = code.replace(
    /<div style="width: 40px; height: 40px; border-radius: 50%; background: var\(--color-bg-hover\); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 4px;">[\s\S]*?<\/div>/,
    ''
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
console.log('Successfully updated timeline item template');
