const fs = require('fs');

let cssCode = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

const oldCssRegex = /@media\s*\(\s*min-width:\s*1200px\s*\)\s*\{[\s\S]*?\.events-body-blocks\s*\{[\s\S]*?\}\s*\}/;

const newCss = `@media (min-width: 1200px) {
    .events-layout-with-sidebar {
        display: block;
        position: relative;
    }

    .events-sidebar-desktop {
        display: block !important;
        position: absolute;
        right: 100%;
        margin-right: 40px;
        top: 0;
        bottom: 0;
        width: 160px;
        z-index: 10;
        pointer-events: none;
    }

    .events-sidebar-desktop > div {
        position: sticky;
        top: 140px;
        max-height: calc(100vh - 160px);
        overflow-y: auto;
        pointer-events: auto;
    }

    .events-sidebar-desktop::-webkit-scrollbar {
        display: none;
        width: 0;
    }

    .events-body-blocks {
        display: block;
        width: 100%;
    }
}`;

if (oldCssRegex.test(cssCode)) {
    cssCode = cssCode.replace(oldCssRegex, newCss);
} else {
    // Fallback if regex fails
    cssCode += '\n' + newCss;
}

fs.writeFileSync('css/components/interaction/analytics.css', cssCode);
