const fs = require('fs');
let code = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

code = code.replace(/\.analytics-body \{[\s\S]*?\}/, `.analytics-body {
    padding: 16px;
}`);

code = code.replace(/\.detailed-view-header \{[\s\S]*?\}/, `.detailed-view-header {
    align-self: stretch;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 16px;
    margin: -16px -16px 0 -16px;
    padding: 0 16px;
    height: 56px;
    position: sticky;
    top: 56px;
    background: var(--color-bg-card);
    z-index: 15;
}`);

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
    margin: 0 -16px 12px -16px;
    border-bottom: 1px solid var(--color-border);
}`);

fs.writeFileSync('css/components/interaction/analytics.css', code);
console.log("Success");
