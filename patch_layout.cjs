const fs = require('fs');
let content = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

// Replace the wrapping logic
content = content.replace(
    /timelineList\.parentNode\.insertBefore\(wrapper, timelineList\);\s*wrapper\.appendChild\(sidebar\);\s*wrapper\.appendChild\(bodyBlocks\);\s*bodyBlocks\.appendChild\(timelineList\);/g,
    `timelineList.parentNode.insertBefore(wrapper, timelineList);
                        wrapper.appendChild(sidebar);
                        wrapper.appendChild(bodyBlocks);
                        bodyBlocks.appendChild(timelineList);
                        const chartEl = document.getElementById("analytics-timeline-chart");
                        if (chartEl) bodyBlocks.appendChild(chartEl);`
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', content);
