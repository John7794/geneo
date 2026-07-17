const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/aiManager.js', 'utf8');

code = code.replace(/this\.btnOpen\.addEventListener\("click", \(\) => this\.open\(\)\);/, 'this.btnOpen.addEventListener("click", () => { console.log("AI btn clicked!"); this.open(); });');

fs.writeFileSync('scripts/components/interaction/aiManager.js', code);
