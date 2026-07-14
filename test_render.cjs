const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const regex = /render\(\) \{/m;
const newStr = `render() {
        console.log("AnalyticsManager render() called with mode:", window.app?.lineageManager?.logic?.mode);`;

if (regex.test(code)) {
    code = code.replace(regex, newStr);
    fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
    console.log("Success adding log");
} else {
    console.log("Failed to add log");
}
