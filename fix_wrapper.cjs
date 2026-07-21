const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldSidebarFind = `let sidebar = timelineList.parentElement.querySelector('.events-sidebar-desktop');`;
const newSidebarFind = `let sidebar = timelineList.closest('.events-layout-with-sidebar') ? timelineList.closest('.events-layout-with-sidebar').querySelector('.events-sidebar-desktop') : null;`;

code = code.replace(oldSidebarFind, newSidebarFind);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
