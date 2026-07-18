const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldBtn = `<hr style="margin: 20px 0; border: 0; border-top: 1px dashed #eee;" />
        <button id="testLoginBtn" type="button" style="background: #28a745; color: white; border: none; padding: 10px; font-weight: bold; border-radius: 6px; cursor: pointer; width: 100%;">
          Тестовий вхід
        </button>`;

code = code.replace(oldBtn, '');
fs.writeFileSync('server.ts', code);
console.log('Removed test login button');
