const fs = require('fs');
let jsCode = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

jsCode = jsCode.replace(/scroll-margin-top: 180px;/g, '');
jsCode = jsCode.replace(/<li id="timeline-century-\$\{currentCentury\}"/g, '<li id="timeline-century-${currentCentury}" class="analytics-timeline-century-item"');

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', jsCode);
