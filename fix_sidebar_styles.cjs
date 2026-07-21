const fs = require('fs');

let cssCode = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

const oldCss = `@media (min-width: 1200px) {
    .events-layout-with-sidebar {
        display: block;
    }

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

    .events-body-blocks {
        display: block;
        width: 100%;
    }
}`;

const newCss = `@media (min-width: 1200px) {
    .events-layout-with-sidebar {
        display: block;
    }

    .events-sidebar-desktop {
        display: block !important;
        position: fixed;
        top: 80px;
        left: 30px;
        width: 200px;
        max-height: calc(100vh - 120px);
        overflow-y: auto;
        z-index: 100;
    }

    .events-body-blocks {
        display: block;
        width: 100%;
    }
}`;

cssCode = cssCode.replace(oldCss, newCss);
fs.writeFileSync('css/components/interaction/analytics.css', cssCode);
