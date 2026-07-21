const fs = require('fs');

let cssCode = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

const oldCss = `@media (min-width: 1200px) {
    .events-sidebar-desktop {
        display: block !important;
        position: fixed;
        right: calc(50% + 440px);
        top: 170px;
        width: 150px;
        z-index: 10;
        max-height: calc(100vh - 190px);
        overflow-y: auto;
    }
}`;

const newCss = `@media (min-width: 1200px) {
    .events-layout-with-sidebar {
        display: flex;
        flex-direction: row-reverse;
        justify-content: flex-end;
        align-items: flex-start;
        gap: 40px;
    }

    .events-sidebar-desktop {
        display: block !important;
        position: sticky;
        top: 170px;
        width: 150px;
        z-index: 10;
        max-height: calc(100vh - 190px);
        overflow-y: auto;
    }

    .events-body-blocks {
        flex: 1;
        max-width: calc(100% - 190px);
    }
}`;

cssCode = cssCode.replace(oldCss, newCss);
fs.writeFileSync('css/components/interaction/analytics.css', cssCode);
