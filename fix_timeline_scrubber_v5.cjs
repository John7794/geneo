const fs = require('fs');

let content = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

// Revert the wrong replacement
content = content.replace(
    '${rowsHtml}\n                            ${typeof scrubberLineHtml !== "undefined" ? scrubberLineHtml : ""}',
    '${rowsHtml}'
);

// Now do the correct replacement
content = content.replace(
    '<div style="position: relative;" id="analytics-timeline-rows-container">\n                            ${gridHtml}\n                            ${rowsHtml}',
    '<div style="position: relative;" id="analytics-timeline-rows-container">\n                            ${gridHtml}\n                            ${rowsHtml}\n                            ${typeof scrubberLineHtml !== "undefined" ? scrubberLineHtml : ""}'
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', content);
