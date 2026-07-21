const fs = require('fs');

let content = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

content = content.replace(
    /const sidebar = timelineList && timelineList\.closest\('\.events-layout-with-sidebar'\) \? timelineList\.closest\('\.events-layout-with-sidebar'\)\.querySelector\('\.events-sidebar-desktop'\) : null;\s*if \(sidebar\) sidebar\.style\.display = 'none';/,
    ''
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', content);
