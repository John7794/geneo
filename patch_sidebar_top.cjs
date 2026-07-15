const fs = require('fs');
const file = 'scripts/components/interaction/analyticsManager.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `                            <aside class="events-sidebar-desktop" style="display: none;">
                                <div style="position: sticky; top: 90px;">`;

const replacementStr = `                            <aside class="events-sidebar-desktop" style="display: none;">
                                <div style="position: sticky; top: 130px;">`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(file, content);
console.log('Sidebar top patched!');
