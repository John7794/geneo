const fs = require('fs');
const file = '/app/applet/scripts/components/interaction/analyticsManager.js';
let content = fs.readFileSync(file, 'utf8');

// The user wants ALL person links to be neutral, not just in death causes.
// In the CSS I replaced color: var(--color-primary) with var(--color-text-main) but let me double check if any were missed.
content = content.replace(/style="color: var\(--color-primary\); text-decoration: none;"/g, 'style="color: var(--color-text-main); text-decoration: none;"');
content = content.replace(/style="color: var\(--color-primary\); text-decoration: none; font-weight: 500;"/g, 'style="color: var(--color-text-main); text-decoration: none; font-weight: 500;"');

fs.writeFileSync(file, content);
console.log("Fixed neutral links.");
