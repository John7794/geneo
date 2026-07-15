const fs = require('fs');
let code = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

// replace the media query
code = code.replace(/@media \(min-width: 768px\) \{\s*\.analytics-body \{\s*padding: 24px;\s*\}\s*\}/g, "");

// use a variable for padding
code = code.replace(/\.analytics-body \{[\s\S]*?\}/, `.analytics-body {
    --analytics-padding: 16px;
    padding: var(--analytics-padding);
}
@media (min-width: 768px) {
    .analytics-body {
        --analytics-padding: 24px;
    }
}`);

code = code.replace(/\.detailed-view-header \{[\s\S]*?\}/, `.detailed-view-header {
    align-self: stretch;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 16px;
    margin: calc(-1 * var(--analytics-padding)) calc(-1 * var(--analytics-padding)) 0 calc(-1 * var(--analytics-padding));
    padding: 0 var(--analytics-padding);
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
    padding: 8px var(--analytics-padding);
    margin: 0 calc(-1 * var(--analytics-padding)) 12px calc(-1 * var(--analytics-padding));
    border-bottom: 1px solid var(--color-border);
}`);

fs.writeFileSync('css/components/interaction/analytics.css', code);
console.log("Success");
