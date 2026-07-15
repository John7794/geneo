const fs = require('fs');
let code = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

code = code.replace(/\.detailed-view-header {/, `.detailed-view-header {
    align-self: flex-start;
    width: 100%;
    box-sizing: border-box;`);

fs.writeFileSync('css/components/interaction/analytics.css', code);
console.log("Success align-self");
