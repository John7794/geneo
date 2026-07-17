const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/aiManager.js', 'utf8');

const oldFetch = `            const res = await fetch("/api/gemini/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: text, history: this.history.slice(0, -1) })
            });`;

const newFetch = `            const currentUrl = new URL(window.location);
            const currentId = currentUrl.searchParams.get("id");
            
            const res = await fetch("/api/gemini/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    prompt: text, 
                    history: this.history.slice(0, -1),
                    currentProfileId: currentId
                })
            });`;

code = code.replace(oldFetch, newFetch);

fs.writeFileSync('scripts/components/interaction/aiManager.js', code);
console.log('Fixed aiManager.js for profile context');
