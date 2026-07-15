const fs = require('fs');
let code = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

if (!code.includes('.detailed-view-header')) {
    code += `\n
.detailed-view-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 8px;
    position: sticky;
    top: 65px;
    background: var(--color-bg-body);
    z-index: 9;
    padding: 16px 0;
    border-bottom: 1px solid var(--color-border);
    margin-top: -16px;
}
@media (max-width: 768px) {
    .detailed-view-header {
        top: 88px;
    }
}
@media (max-width: 480px) {
    .detailed-view-header {
        top: 95px;
    }
}
`;
    fs.writeFileSync('css/components/interaction/analytics.css', code);
    console.log("Success adding CSS");
}
