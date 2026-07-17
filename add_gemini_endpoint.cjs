const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const importGenAI = `import { GoogleGenAI } from "@google/genai";\n`;

const endpointCode = `
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
    const prompt = req.body.prompt;
    const history = req.body.history || [];
    
    // Instead of using chat sessions which might require specific message history format,
    // we'll format the history into the prompt or contents for a simple implementation
    
    let contents = [];
    for (const msg of history) {
       contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] });
    }
    contents.push({ role: 'user', parts: [{ text: prompt }] });
    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: "You are a helpful AI assistant specialized in genealogy research. Help the user discover their family history, explain historical contexts, analyze surnames, and suggest where to find archival records. Answer concisely and politely in Ukrainian.",
      }
    });
    
    res.json({ text: response.text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || 'Error generating response' });
  }
});
`;

if (!code.includes('GoogleGenAI')) {
  // Add import at top
  code = importGenAI + code;
  // Insert endpoint before the static file serving block
  const target = `if (process.env.NODE_ENV !== "production") {`;
  const lastIndex = code.lastIndexOf(target);
  if (lastIndex !== -1) {
    code = code.slice(0, lastIndex) + endpointCode + '\n' + code.slice(lastIndex);
  } else {
    code += endpointCode;
  }
  fs.writeFileSync('server.ts', code);
  console.log('Added gemini endpoint');
} else {
  console.log('GoogleGenAI already imported');
}
