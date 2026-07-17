const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/model: "gemini-3\.5-flash"/, 'model: "gemini-2.5-flash"');

const oldAiInit = `const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });`;

const newAiInit = `if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured. Please add your Gemini API Key in the Settings -> Secrets menu.");
    }
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });`;

code = code.replace(oldAiInit, newAiInit);
fs.writeFileSync('server.ts', code);
console.log('Fixed server.ts');
