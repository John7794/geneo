const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

code = code.replace(
    'funeral: "ri-home-4-line"',
    'funeral: "ri-archive-line"'
);

code = code.replace(
    '<div style="font-size: 13px; color: var(--color-text-muted); margin-bottom: 2px;">${dateStr}</div>\n                                    <div style="font-weight: 500; font-size: 15px; margin-bottom: 4px; color: var(--color-text-main);">${typeLabels[evt.type] || evt.type}</div>',
    '<div style="font-weight: 600; font-size: 15px; margin-bottom: 2px; color: var(--color-text-main);">${dateStr}</div>\n                                    <div style="font-weight: 500; font-size: 14px; color: var(--color-text-muted); margin-bottom: 4px;">${typeLabels[evt.type] || evt.type}</div>'
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
console.log('Successfully updated timeline design');
