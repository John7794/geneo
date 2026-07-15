const fs = require('fs');
let code = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

code = code.replace(/\.detailed-view-header \{[\s\S]*?\}/, `.detailed-view-header {
    align-self: stretch;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 16px;
    margin: -20px -20px 0 -20px;
    padding: 0 16px;
    height: 56px;
    position: sticky;
    top: 56px;
    background: var(--color-bg-card);
    z-index: 15;
}`);

code = code.replace(/\.detailed-view-header::before \{[\s\S]*?\}/, `.detailed-view-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100vw;
    right: -100vw;
    bottom: 0;
    background: var(--color-bg-card);
    z-index: -1;
}`);

fs.writeFileSync('css/components/interaction/analytics.css', code);
console.log("Success");
