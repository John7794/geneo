const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

code = code.replace(/top: 65px;/g, `top: 0;`);

fs.writeFileSync('index.html', code);
console.log("Success changing top: 0");
