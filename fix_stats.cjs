const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const replacement = `
        const confMax = lifespansConfirmed.length > 0 ? Math.max(...lifespansConfirmed.map(s => s.age)) : 0;
        const approxMax = lifespansApprox.length > 0 ? Math.max(...lifespansApprox.map(s => s.age)) : 0;
        let html = \``;

js = js.replace(/let html = \`/, replacement);
js = js.replace(/\$\{confStats\.max > 0 \? confStats\.max : approxStats\.max\}/g, '${confMax > 0 ? confMax : approxMax}');

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
console.log("Success fix stats");
