const fs = require('fs');
let code = fs.readFileSync('scripts/main.js', 'utf8');

if (!code.includes('this.managers.ai = new AIManager()')) {
  code = code.replace(
    /this\.managers\.share = new ShareManager\(this\);/,
    `this.managers.share = new ShareManager(this);\n\t\tthis.managers.ai = new AIManager();`
  );
  
  fs.writeFileSync('scripts/main.js', code);
  console.log('Added AIManager instantiation to main.js');
}
