const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/aiManager.js', 'utf8');

code = code.replace(/this\.overlay\.classList\.remove\("hidden"\);/g, 'this.overlay.classList.remove("hidden"); this.overlay.classList.add("show");');
code = code.replace(/this\.overlay\.classList\.add\("hidden"\);/g, 'this.overlay.classList.add("hidden"); this.overlay.classList.remove("show");');

fs.writeFileSync('scripts/components/interaction/aiManager.js', code);
console.log('Fixed AIManager show/hide logic');
