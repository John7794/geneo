const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const regex = /const d = parseInt\(record\[cols\.day\], 10\);\s*const m = parseInt\(record\[cols\.month\], 10\);\s*const yearVal = parseInt\(record\[cols\.year\], 10\);/g;

code = code.replace(regex, 'const d = parseInt(record[cols.day], 10);\nconst m = parseInt(record[cols.month], 10);\nconst yearStr = record[cols.year] ? String(record[cols.year]).trim() : "";\nconst yearVal = parseInt(yearStr, 10);');

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
