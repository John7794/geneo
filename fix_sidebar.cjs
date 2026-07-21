const fs = require('fs');

let content = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

content = content.replace(
    "const sidebar = document.querySelector('.events-sidebar-desktop');",
    "const timelineList = document.getElementById('analytics-timeline-list');\n                    const sidebar = timelineList && timelineList.closest('.events-layout-with-sidebar') ? timelineList.closest('.events-layout-with-sidebar').querySelector('.events-sidebar-desktop') : null;"
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', content);
