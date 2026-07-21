const fs = require('fs');

let content = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

content = content.replace(
    'let axisHtml = \'<div style="position: relative; height: 30px; border-bottom: 1px solid var(--color-border); z-index: 10;">\';',
    'let axisHtml = \'<div style="position: sticky; top: 0; height: 30px; border-bottom: 1px solid var(--color-border); z-index: 100; background-color: var(--color-background);">\';'
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', content);
