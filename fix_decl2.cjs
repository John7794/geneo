const fs = require('fs');
let content = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

content = content.replace(
    'const timelineList = document.getElementById("analytics-timeline-list");\\n                if (timelineList) {\\n                    timelineList.innerHTML = html;',
    'if (timelineList) {\\n                    timelineList.innerHTML = html;'
);
content = content.replace(
    'const timelineList = document.getElementById("analytics-timeline-list");\n                if (timelineList) {\n                    timelineList.innerHTML = html;',
    'if (timelineList) {\n                    timelineList.innerHTML = html;'
);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', content);
