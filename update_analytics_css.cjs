const fs = require('fs');
let code = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

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
}`);

code = code.replace(/\.analytics-header-left \{[\s\S]*?\}/, `.analytics-header-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex: 1;
}`);

code = code.replace(/\.analytics-header-left h1 \{[\s\S]*?\}/, `.analytics-header-left h1 {
    font-size: 20px;
    font-weight: bold;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
}`);

code = code.replace(/\.detailed-view-header \{[\s\S]*?\}/, `.detailed-view-header {
    align-self: stretch;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 16px;
    margin: -20px -20px 16px -20px;
    padding: 0 16px;
    height: 56px;
    position: sticky;
    top: 56px;
    background: var(--color-bg-card);
    z-index: 15;
    border-bottom: 1px solid var(--color-border);
}`);

code = code.replace(/\.analytics-sort-controls \{[\s\S]*?\}/, `.analytics-sort-controls {
    display: flex;
    margin-left: auto;
    font-size: 12px;
    font-weight: normal;
    align-items: center;
    position: sticky;
    top: 112px;
    z-index: 10;
    background: var(--color-bg-body);
    padding: 8px 0;
    margin-top: -8px;
    margin-bottom: 16px;
}`);

fs.writeFileSync('css/components/interaction/analytics.css', code);
console.log("Success");
