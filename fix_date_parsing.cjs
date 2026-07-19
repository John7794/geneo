const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

// Fix processEvents
code = code.replace(
    /const yearStr = record\[cols\.year\] \? String\(record\[cols\.year\]\)\.trim\(\) : "";\s+const yearVal = parseInt\(yearStr, 10\);/g,
    `const yearStr = record[cols.year] ? String(record[cols.year]).trim() : "";
                    let yearVal = parseInt(yearStr, 10);
                    const yearMatch = yearStr.match(/\\b(1[0-9]{3}|20[0-9]{2})\\b/);
                    if (yearMatch) {
                        yearVal = parseInt(yearMatch[1], 10);
                    }`
);

// Fix dateStr
const oldDateStrLogic = `                        if (evt.original.yearStr && (!d && !m)) {
                            dateStr = escapeHtml(evt.original.yearStr);
                        } else {
                            if (d) dateStr += escapeHtml(d) + " ";
                            if (m) dateStr += escapeHtml(getMonthNameSafe(m, !d)) + " ";
                            if (evt.original.yearStr) {
                                dateStr += escapeHtml(evt.original.yearStr);
                            } else if (y) {
                                dateStr += escapeHtml(y);
                            }
                        }`;

const newDateStrLogic = `                        let cleanedYearStr = evt.original.yearStr ? evt.original.yearStr.replace(/\\b\\d{2}\\.(\\d{4})\\b/g, '$1') : "";
                        if (cleanedYearStr && (!d && !m)) {
                            dateStr = escapeHtml(cleanedYearStr);
                        } else {
                            if (d) dateStr += escapeHtml(d) + " ";
                            if (m) dateStr += escapeHtml(getMonthNameSafe(m, !d)) + " ";
                            if (cleanedYearStr) {
                                dateStr += escapeHtml(cleanedYearStr);
                            } else if (y) {
                                dateStr += escapeHtml(y);
                            }
                        }`;

code = code.replace(oldDateStrLogic, newDateStrLogic);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
