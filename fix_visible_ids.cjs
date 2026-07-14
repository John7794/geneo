const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const regex = /if \(window\.app && window\.app\.managers && window\.app\.managers\.lineage && window\.app\.managers\.lineage\.logic\) \{\s*const mode = window\.app\.managers\.lineage\.logic\.mode;\s*if \(mode && mode !== "all"\) \{\s*visibleIds = new Set\(window\.app\.managers\.lineage\.logic\.queue\.map\(String\)\);\s*\}\s*\}/m;

const newStr = `if (window.app && window.app.managers && window.app.managers.lineage && window.app.managers.lineage.logic) {
            visibleIds = new Set(window.app.managers.lineage.logic.queue.map(String));
        }`;

if (regex.test(code)) {
    code = code.replace(regex, newStr);
    fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
    console.log("Success replacing visibleIds logic");
} else {
    console.log("Failed to find regex");
}
