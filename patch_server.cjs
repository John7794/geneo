const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  'let adminConfig = { projectId: "geneo-b8e63" };',
  'let adminConfig: any = { projectId: "geneo-b8e63" };'
);

fs.writeFileSync('server.ts', code);
console.log('Fixed server.ts TypeScript error');
