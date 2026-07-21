const fs = require('fs');
let cssCode = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

if (!cssCode.includes('.analytics-summary-stats')) {
cssCode += `
.analytics-summary-stats {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    text-align: center;
    gap: 24px;
}
.analytics-summary-stats-divider {
    width: 100%;
    height: 1px;
    background: var(--color-border-light);
}

@media (min-width: 600px) {
    .analytics-summary-stats {
        flex-direction: row;
        gap: 0;
    }
    .analytics-summary-stats-divider {
        width: 1px;
        height: 60px;
        margin: 0 16px;
    }
}
`;
fs.writeFileSync('css/components/interaction/analytics.css', cssCode);
}
