const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const regex = /if \(pid && window\.app && window\.app\.managers\.personPopup\) \{\s*window\.app\.managers\.personPopup\.show\(pid\);\s*\}/m;
const newStr = `if (pid && window.app && window.app.navigateToId) {
                            window.app.navigateToId(pid, false, 'profile');
                        }`;

if (regex.test(code)) {
    code = code.replace(regex, newStr);
    fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
    console.log("Success replacing popup with navigateToId");
} else {
    console.log("Failed to find regex");
}
