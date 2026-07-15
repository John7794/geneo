const fs = require('fs');
let code = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

// Fix detailed-view-header margins and background extension
code = code.replace(/\.detailed-view-header \{[\s\S]*?\}/, `.detailed-view-header {
    align-self: stretch;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 16px;
    margin: -20px -20px 8px -20px;
    padding: 0 16px;
    height: 56px;
    position: sticky;
    top: 56px;
    background: var(--color-bg-card);
    z-index: 15;
    border-bottom: 1px solid var(--color-border);
}
.detailed-view-header::before {
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

// Fix sort controls background extension and margin
code = code.replace(/\.analytics-sort-controls \{[\s\S]*?\}/, `.analytics-sort-controls {
    display: flex;
    font-size: 12px;
    font-weight: normal;
    align-items: center;
    position: sticky;
    top: 112px;
    z-index: 14;
    background: var(--color-bg-body);
    padding: 8px 16px;
    margin: -8px -20px 8px -20px;
}
.analytics-sort-controls::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100vw;
    right: -100vw;
    bottom: 0;
    background: var(--color-bg-body);
    z-index: -1;
}`);

// Update header to have pseudo element for background stretching just in case
code = code.replace(/\.analytics-header \{[\s\S]*?\}/, `.analytics-header {
    padding: 0 16px;
    height: 56px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    background: var(--color-bg-card);
    border-bottom: 1px solid var(--color-border);
    position: sticky;
    top: 0;
    z-index: 20;
}
.analytics-header::before {
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

fs.writeFileSync('css/components/interaction/analytics.css', code);
console.log("Success");
