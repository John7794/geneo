const fs = require('fs');
let cssCode = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

cssCode += `
.analytics-sort-desktop .btn-sort-places, #timeline-sort-btn, #timeline-filter-type {
    height: 32px !important;
    padding: 0 12px !important;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}
`;

cssCode = cssCode.replace(/#analytics-timeline \.events-sidebar-desktop > div \{\s*top: 176px;\s*\}/, `#analytics-timeline .events-sidebar-desktop > div {\n    top: 172px;\n}`);
cssCode = cssCode.replace(/#analytics-places \.events-sidebar-desktop > div \{\s*top: 176px;\s*\}/, `#analytics-places .events-sidebar-desktop > div {\n    top: 172px;\n}`);
cssCode = cssCode.replace(/\.analytics-place-item \{\s*scroll-margin-top: 176px;\s*\}/, `.analytics-place-item {\n    scroll-margin-top: 172px;\n}`);
cssCode = cssCode.replace(/\.analytics-timeline-century-item \{\s*scroll-margin-top: 176px;\s*\}/, `.analytics-timeline-century-item {\n    scroll-margin-top: 172px;\n}`);

fs.writeFileSync('css/components/interaction/analytics.css', cssCode);
