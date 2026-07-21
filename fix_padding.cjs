const fs = require('fs');
let css = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

css = css.replace('.analytics-sort-desktop .btn-sort-places, #timeline-sort-btn, #timeline-filter-type {', '.analytics-sort-desktop .btn-sort-places, #timeline-sort-btn {');

fs.writeFileSync('css/components/interaction/analytics.css', css);
