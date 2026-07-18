const fs = require('fs');
let code = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

code = code.replace(/\/\* Custom scrollbar for sidebar \*\/[\s\S]*?(?=\n\n|$)/, `/* Custom scrollbar for sidebar */
.events-sidebar-desktop::-webkit-scrollbar {
    display: none;
    width: 0;
}

.events-sidebar-desktop {
    -ms-overflow-style: none;
    scrollbar-width: none;
}`);

fs.writeFileSync('css/components/interaction/analytics.css', code);
console.log('Fixed scrollbar');
