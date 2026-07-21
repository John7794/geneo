const fs = require('fs');
let cssCode = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

cssCode = cssCode.replace(/#analytics-timeline \.events-sidebar-desktop > div \{\s*top: 180px;\s*\}/, `#analytics-timeline .events-sidebar-desktop > div {\n    top: 176px;\n}`);
cssCode = cssCode.replace(/#analytics-events \.events-sidebar-desktop > div \{\s*top: 132px;\s*\}/, `#analytics-events .events-sidebar-desktop > div {\n    top: 136px;\n}`);
cssCode = cssCode.replace(/#analytics-places \.events-sidebar-desktop > div \{\s*top: 180px;\s*\}/, `#analytics-places .events-sidebar-desktop > div {\n    top: 186px;\n}`);

fs.writeFileSync('css/components/interaction/analytics.css', cssCode);
