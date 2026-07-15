const fs = require('fs');
const file = 'css/components/interaction/analytics.css';
let content = fs.readFileSync(file, 'utf8');

const targetCSS = `@media (min-width: 1200px) {
    .events-sidebar-desktop {
        display: block !important;
        position: absolute;
        right: 100%;
        top: 0;
        width: 150px;
        margin-right: 40px;
        height: 100%;
        z-index: 10;
    }
}`;

const replacementCSS = `@media (min-width: 1200px) {
    .events-sidebar-desktop {
        display: block !important;
        position: fixed;
        right: calc(50% + 440px);
        top: 140px;
        width: 150px;
        z-index: 10;
        max-height: calc(100vh - 160px);
        overflow-y: auto;
    }
}`;

content = content.replace(targetCSS, replacementCSS);
fs.writeFileSync(file, content);
console.log('Sidebar fixed');
