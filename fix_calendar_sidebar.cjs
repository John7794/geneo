const fs = require('fs');
let cssCode = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

cssCode += `
#analytics-timeline .events-sidebar-desktop > div {
    top: 180px;
}
#analytics-events .events-sidebar-desktop > div {
    top: 132px;
}
`;

fs.writeFileSync('css/components/interaction/analytics.css', cssCode);
