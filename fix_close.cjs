const fs = require('fs');

function replaceClose(file) {
    let code = fs.readFileSync(file, 'utf8');
    code = code.replace(/class="btn btn-primary mt-2"/g, `class="btn mt-2" style="background: var(--color-bg-hover); color: var(--color-text-main); border: 1px solid var(--color-border);"`);
    fs.writeFileSync(file, code);
}

replaceClose('index.html');
replaceClose('scripts/components/interaction/analyticsManager.js');
console.log("Success replacing close buttons");
