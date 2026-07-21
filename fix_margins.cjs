const fs = require('fs');
let jsCode = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

jsCode = jsCode.replace(/<li id="\$\{blockId\}" class="analytics-place-item" style="list-style: none; margin-top: 24px;/g, '<li id="${blockId}" class="analytics-place-item" style="list-style: none; margin-top: ${html === "" ? "0" : "24px"};');
jsCode = jsCode.replace(/<li id="event-month-\$\{m\}" class="analytics-event-month-item" style="list-style: none; margin-top: 24px;/g, '<li id="event-month-${m}" class="analytics-event-month-item" style="list-style: none; margin-top: ${html === "" ? "0" : "24px"};');

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', jsCode);
