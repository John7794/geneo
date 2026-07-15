const fs = require('fs');

const file = 'scripts/components/interaction/analyticsManager.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `<div class="profile-layout-with-sidebar">
                            <aside class="profile-sidebar" style="position: sticky; top: 90px; align-self: flex-start; margin-right: 20px; margin-top: 24px;">`;

const replacementStr = `<div style="display: flex; gap: 40px; align-items: flex-start; position: relative; width: 100%;">
                            <aside class="profile-sidebar" style="position: sticky; top: 90px; left: auto; margin-top: 24px; flex-shrink: 0; width: 150px;">`;

content = content.replace(targetStr, replacementStr);

fs.writeFileSync(file, content);
console.log('Sidebar patched!');
