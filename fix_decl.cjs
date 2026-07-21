const fs = require('fs');
let content = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

content = content.replace(
    "const timelineList = document.getElementById('analytics-timeline-list');\\n                    const sidebar = timelineList",
    "const sidebar = timelineList"
);
content = content.replace("const timelineList = document.getElementById('analytics-timeline-list');\n                    const sidebar = timelineList", "const sidebar = timelineList");

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', content);
