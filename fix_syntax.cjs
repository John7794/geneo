const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');
let lines = js.split('\n');
// We want to remove the extra '}' around line 638.
// Let's find "btnBack.addEventListener" and the following "}" and the one after it.
let removed = false;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('// Render Places')) {
        // Look backwards for the '}' to remove
        for (let j = i - 1; j >= 0; j--) {
            if (lines[j].trim() === '}') {
                console.log("Removing '}' at line " + (j + 1));
                lines.splice(j, 1);
                removed = true;
                break;
            }
        }
        break;
    }
}
if (removed) {
    fs.writeFileSync('scripts/components/interaction/analyticsManager.js', lines.join('\n'));
} else {
    console.log("Not found.");
}
