const fs = require('fs');
let cssCode = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

cssCode = cssCode.replace(/\.events-sidebar-desktop::-webkit-scrollbar/g, '.events-sidebar-desktop::-webkit-scrollbar, .events-sidebar-desktop > div::-webkit-scrollbar');
cssCode = cssCode.replace(/\.events-sidebar-desktop \{[\s\n]*-ms-overflow-style: none;[\s\n]*scrollbar-width: none;[\s\n]*\}/g, `.events-sidebar-desktop, .events-sidebar-desktop > div {
    -ms-overflow-style: none;
    scrollbar-width: none;
}`);

fs.writeFileSync('css/components/interaction/analytics.css', cssCode);
