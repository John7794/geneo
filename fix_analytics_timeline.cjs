const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

// Replace in processEventsForTimeline
code = code.replace(
    'const m = parseInt(record[cols.month], 10);\n                    const yearVal = parseInt(record[cols.year], 10);',
    'const m = parseInt(record[cols.month], 10);\n                    const yearStr = record[cols.year] ? String(record[cols.year]).trim() : "";\n                    const yearVal = parseInt(yearStr, 10);'
);

code = code.replace(
    'original: { day: isNaN(d) ? null : d, month: isNaN(m) ? null : m, year: yearVal, isOldStyle },',
    'original: { day: isNaN(d) ? null : d, month: isNaN(m) ? null : m, year: yearVal, isOldStyle, yearStr },'
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
