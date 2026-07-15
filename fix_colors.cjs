const fs = require('fs');
let code = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

code = code.replace(/\.analytics-sort-controls \{[\s\S]*?\}/, `.analytics-sort-controls {
    display: flex;
    font-size: 12px;
    font-weight: normal;
    align-items: center;
    position: sticky;
    top: 112px;
    z-index: 14;
    background: var(--color-bg-card);
    padding: 8px 16px;
    margin: 0 -20px 16px -20px;
    border-bottom: 1px solid var(--color-border);
}`);

code = code.replace(/\.analytics-sort-controls::before \{[\s\S]*?\}/, `.analytics-sort-controls::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100vw;
    right: -100vw;
    bottom: 0;
    background: var(--color-bg-card);
    border-bottom: 1px solid var(--color-border);
    z-index: -1;
}`);

// also remove border-bottom from detailed-view-header so it merges with sort controls
code = code.replace(/border-bottom: 1px solid var\(--color-border\);/g, function(match, offset, string) {
    // we want to keep it on .analytics-header, .analytics-sort-controls, but remove from .detailed-view-header
    return match; // Actually, let's just use string replacement carefully
});

fs.writeFileSync('css/components/interaction/analytics.css', code);
console.log("Success");
