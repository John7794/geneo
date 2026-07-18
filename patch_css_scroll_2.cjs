const fs = require('fs');
let code = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

code = code.replace(/\.events-sidebar-desktop::-webkit-scrollbar-track[\s\S]*?\}\n/g, "");
code = code.replace(/\.events-sidebar-desktop::-webkit-scrollbar-thumb[\s\S]*?\}\n/g, "");

fs.writeFileSync('css/components/interaction/analytics.css', code);
console.log('Cleaned up remaining scrollbar css');
