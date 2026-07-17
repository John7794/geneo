const fs = require('fs');
let code = fs.readFileSync('scripts/main.js', 'utf8');

if (!code.includes('AIManager')) {
  code = code.replace(
    /import \{ GlobalModalInterceptor \} from "\.\/core\/globalModalInterceptor\.js";/,
    `import { GlobalModalInterceptor } from "./core/globalModalInterceptor.js";\nimport { AIManager } from "./components/interaction/aiManager.js";`
  );

  code = code.replace(
    /this\.managers\.share = new ShareManager\(\);/,
    `this.managers.share = new ShareManager();\n        this.managers.ai = new AIManager();`
  );
  
  fs.writeFileSync('scripts/main.js', code);
  console.log('Added AIManager to main.js');
}
