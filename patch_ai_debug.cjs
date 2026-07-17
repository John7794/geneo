const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/aiManager.js', 'utf8');

code = code.replace(/init\(\) \{/, 'init() { console.log("AIManager init:", !!this.btnOpen, !!this.overlay);');

fs.writeFileSync('scripts/components/interaction/aiManager.js', code);
