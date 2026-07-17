const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const contextLogic = `
let cachedDbContext = "";
function getDbContext() {
  if (cachedDbContext) return cachedDbContext;
  try {
    const basic = fs.readFileSync(path.join(process.cwd(), 'data/db/uk/basic.csv'), 'utf8');
    const roles = fs.readFileSync(path.join(process.cwd(), 'data/db/uk/familyRoles.csv'), 'utf8');
    const birth = fs.readFileSync(path.join(process.cwd(), 'data/db/uk/birth.csv'), 'utf8');
    const death = fs.readFileSync(path.join(process.cwd(), 'data/db/uk/death.csv'), 'utf8');
    
    cachedDbContext = \`
Ось дані бази родоводу (у форматі CSV). Використовуй їх для відповідей на питання.
Не вигадуй дані, спирайся тільки на цю інформацію.

[basic.csv - основні дані (id, прізвище, ім'я, по батькові)]
\${basic}

[familyRoles.csv - родинні зв'язки (id, біологічні батьки, подружжя)]
\${roles}

[birth.csv - дані про народження]
\${birth}

[death.csv - дані про смерть]
\${death}
\`;
    return cachedDbContext;
  } catch(e) {
    console.error("Error reading db files:", e);
    return "";
  }
}
`;

if(!code.includes('function getDbContext()')) {
  // insert contextLogic after imports
  code = code.replace(/const PORT = process\.env\.PORT \|\| 3000;/, "const PORT = process.env.PORT || 3000;\n" + contextLogic);
}

const oldSystemInstruction = `systemInstruction: "You are a helpful AI assistant specialized in genealogy research. Help the user discover their family history, explain historical contexts, analyze surnames, and suggest where to find archival records. Answer concisely and politely in Ukrainian.",`;
const newSystemInstruction = `systemInstruction: "You are a helpful AI assistant specialized in genealogy research. Help the user discover their family history, explain historical contexts, analyze surnames, and suggest where to find archival records. Answer concisely and politely in Ukrainian. Ось база даних проекту: " + getDbContext(),`;

code = code.replace(oldSystemInstruction, newSystemInstruction);

fs.writeFileSync('server.ts', code);
console.log('Fixed server.ts context');
