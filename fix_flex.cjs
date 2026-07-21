const fs = require('fs');

let content = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

content = content.replace(
    '<div style="font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 4px 0;">',
    '<div style="font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 4px 0; flex-shrink: 0;">'
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', content);
