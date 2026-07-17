const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldPromptExt = `    const prompt = req.body.prompt;
    const history = req.body.history || [];`;

const newPromptExt = `    const prompt = req.body.prompt;
    const history = req.body.history || [];
    const currentProfileId = req.body.currentProfileId;`;

code = code.replace(oldPromptExt, newPromptExt);

const oldSysInst = `        systemInstruction: "You are a helpful AI assistant specialized in genealogy research. Help the user discover their family history, explain historical contexts, analyze surnames, and suggest where to find archival records. Answer concisely and politely in Ukrainian. Ось база даних проекту: " + getDbContext(),`;

const newSysInst = `        systemInstruction: "You are a helpful AI assistant specialized in genealogy research. Help the user discover their family history, explain historical contexts, analyze surnames, and suggest where to find archival records. Answer concisely and politely in Ukrainian." +
          (currentProfileId ? "\\n\\nКористувач зараз переглядає профіль персони з ID=" + currentProfileId + ". Враховуй це, якщо питання стосується 'цієї людини' або поточного контексту." : "") +
          "\\n\\nОсь база даних проекту: " + getDbContext(),`;

code = code.replace(oldSysInst, newSysInst);

fs.writeFileSync('server.ts', code);
console.log('Fixed server.ts for profile context');
