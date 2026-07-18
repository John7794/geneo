const fs = require('fs');
let code = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

if (!code.includes('.analytics-place-item {')) {
    code += '\n.analytics-place-item {\n    scroll-margin-top: 130px;\n}\n';
    fs.writeFileSync('css/components/interaction/analytics.css', code);
    console.log('Added scroll margin for place items');
}
