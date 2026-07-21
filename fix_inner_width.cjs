const fs = require('fs');

let content = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

content = content.replace(
    /style="min-width: \$\{totalWidth \+ 300\}px; position: relative;" id="analytics-timeline-chart-inner"/,
    'style="min-width: max(${totalWidth + 300}px, 100%); position: relative;" id="analytics-timeline-chart-inner"'
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', content);
