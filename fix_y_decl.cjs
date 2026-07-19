const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

code = code.replace(
    'const y = evt.gregorian.year;\n                        if (y && !isNaN(y)) {',
    'if (evt.gregorian.year && !isNaN(evt.gregorian.year)) {\n                            const c = Math.ceil(evt.gregorian.year / 100);'
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
