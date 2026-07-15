const fs = require('fs');
let code = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

// Replace media queries
code = code.replace(/@media \(max-width: 768px\) {[\s\S]*?top: 88px;[\s\S]*?}/, '');
code = code.replace(/@media \(max-width: 480px\) {[\s\S]*?top: 95px;[\s\S]*?}/, '');

code = code.replace(/\.detailed-view-header \{/, `.detailed-view-header {
    position: -webkit-sticky;
    width: 100%;`);

fs.writeFileSync('css/components/interaction/analytics.css', code);
console.log("Success updating css");
