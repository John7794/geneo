const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

code = code.replace(
    'original: { day: d, month: m, year: yearVal, isOldStyle },',
    'original: { day: d, month: m, year: yearVal, isOldStyle, yearStr },'
);

code = code.replace(
    /let yearInfo = evt\.year && !isNaN\(evt\.year\) \? `<span style="color: var\(--color-text-muted\); font-size: 13px; margin-left: 8px;">\(\$\{evt\.year\} р\.\)<\/span>` : '';/g,
    'let yearInfo = evt.original.yearStr ? `<span style="color: var(--color-text-muted); font-size: 13px; margin-left: 8px;">(${escapeHtml(evt.original.yearStr)} р.)</span>` : (evt.year && !isNaN(evt.year) ? `<span style="color: var(--color-text-muted); font-size: 13px; margin-left: 8px;">(${evt.year} р.)</span>` : "");'
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
