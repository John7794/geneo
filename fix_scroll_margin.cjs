const fs = require('fs');
let cssCode = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

cssCode += `
.analytics-place-item {
    scroll-margin-top: 186px;
}
.analytics-event-month-item {
    scroll-margin-top: 136px;
}
.analytics-timeline-century-item {
    scroll-margin-top: 176px;
}
`;

fs.writeFileSync('css/components/interaction/analytics.css', cssCode);
