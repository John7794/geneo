const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

// Remove secondary text lines from summary buttons
code = code.replace(/<div style="font-size: 13px; color: var\(--color-text-meta\);">макс: \$\{confMax > 0 \? confMax : approxMax\} р\.<\/div>/g, "");
code = code.replace(/<div style="font-size: 13px; color: var\(--color-text-meta\);">унікальних: \$\{uniqueNamesMCount \+ uniqueNamesFCount\}<\/div>/g, "");
code = code.replace(/<div style="font-size: 13px; color: var\(--color-text-meta\);">унікальних: \$\{uniqueSurnamesCount\}<\/div>/g, "");
code = code.replace(/<div style="font-size: 13px; color: var\(--color-text-meta\);">унікальних: \$\{uniquePlacesCount\}<\/div>/g, "");
code = code.replace(/<div style="font-size: 13px; color: var\(--color-text-meta\);">унікальних: \$\{uniqueDeathsCount\}<\/div>/g, "");
code = code.replace(/<div style="font-size: 13px; color: var\(--color-text-meta\);">події<\/div>/g, "");
code = code.replace(/<div style="font-size: 13px; color: var\(--color-text-meta\);">унікальних: \$\{uniqueCoatsCount\}<\/div>/g, "");

// Change h4 to div for days in events calendar
code = code.replace(/<h4 style="margin: 0; font-size: 16px; font-weight: 600; color: var\(--color-text-main\); background: var\(--color-bg-sub\); padding: 4px 12px; border-radius: 4px; display: inline-block;">\$\{d\} \$\{getMonthName\(m\)\}<\/h4>/g, '<div style="margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text-main); background: var(--color-bg-sub); padding: 4px 12px; border-radius: 4px; display: inline-block;">${d} ${getMonthName(m)}</div>');

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
console.log("Success replacing texts and h4");
