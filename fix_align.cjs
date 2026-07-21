const fs = require('fs');

let jsCode = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

jsCode = jsCode.replace(
    /margin-top: 24px; margin-bottom: 16px; display: flex; align-items: center; width: 100%; padding: 12px 0; scroll-margin-top: 160px;/g,
    'margin-top: ${html === "" ? "0" : "24px"}; margin-bottom: 16px; display: flex; align-items: center; width: 100%; padding: 12px 0; scroll-margin-top: 180px;'
);

// Also fix Places so the first item has no margin-top if it currently has one?
// Wait, Places has no margin-top on the first item, but it might have margin on the h3 toc-title!
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', jsCode);
