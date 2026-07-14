const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const regex = /                        const pid = n\[COLUMNS\.names\?\.personId \|\| "person_id"\];/m;

const newStr = `                        const pid = n[COLUMNS.names?.personId || "person_id"];
                        if (visibleIds && !visibleIds.has(String(pid))) return;`;

if (regex.test(code)) {
    code = code.replace(regex, newStr);
    fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
    console.log("Success adding visibleIds filter to coats");
} else {
    console.log("Not found regex 3");
}
