const fs = require('fs');

let content = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

// Replace the second declaration
content = content.replace('const scrubberHtml = "";', '');

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', content);
