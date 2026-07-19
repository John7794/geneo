const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

code = code.replace(
    '<div style="display: flex; gap: 8px; margin-bottom: 24px; margin-top: 16px;">',
    '<div style="display: flex; gap: 8px; margin-bottom: 8px; margin-top: -16px; position: sticky; top: -1px; z-index: 10; background: var(--color-bg-body); padding-top: 16px; padding-bottom: 16px; border-bottom: 1px solid transparent;">'
);

fs.writeFileSync('index.html', code);
console.log('Successfully updated timeline buttons sticky');
