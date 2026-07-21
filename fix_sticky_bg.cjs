const fs = require('fs');

let content = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

content = content.replace(
    'let axisHtml = \'<div style="position: sticky; top: -16px; margin-top: -16px; padding-top: 16px; height: 46px; border-bottom: 1px solid var(--color-border); z-index: 100; background-color: var(--color-bg-card);">\';',
    'let axisHtml = \'<div style="position: sticky; top: 0; height: 30px; border-bottom: 1px solid var(--color-border); z-index: 100; background-color: var(--color-bg-card);">\';'
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', content);
