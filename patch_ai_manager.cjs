const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/aiManager.js', 'utf8');

const oldConstructor = `        this.messagesContainer = document.getElementById("ai-chat-messages");
        this.history = [];
        
        this.init();`;
        
const newConstructor = `        this.messagesContainer = document.getElementById("ai-chat-messages");
        this.btnClear = document.getElementById("ai-chat-clear");
        this.tokenUsageEl = document.getElementById("ai-token-usage");
        this.history = [];
        
        this.init();`;
        
code = code.replace(oldConstructor, newConstructor);

const oldInit = `        if (this.input) {
            this.input.addEventListener("keypress", (e) => {
                if (e.key === "Enter") this.sendMessage();
            });
        }`;
        
const newInit = `        if (this.input) {
            this.input.addEventListener("keypress", (e) => {
                if (e.key === "Enter") this.sendMessage();
            });
        }
        if (this.btnClear) {
            this.btnClear.addEventListener("click", () => this.clearChat());
        }`;
        
code = code.replace(oldInit, newInit);

const newMethods = `    clearChat() {
        this.history = [];
        if (this.messagesContainer) {
            this.messagesContainer.innerHTML = \`<div style="background: var(--color-bg-card); padding: 12px 16px; border-radius: 12px; border: 1px solid var(--color-border); align-self: flex-start; max-width: 85%;">
                Привіт! Я ваш персональний асистент з генеалогії. Чим можу допомогти у ваших дослідженнях?
            </div>\`;
        }
        if (this.tokenUsageEl) {
            this.tokenUsageEl.innerText = "0";
        }
    }

    appendMessage(text, isUser = false) {`;
    
code = code.replace(`    appendMessage(text, isUser = false) {`, newMethods);

const oldResponse = `            if (res.ok && data.text) {
                this.appendMessage(data.text, false);
                this.history.push({ role: "model", text: data.text });
            } else {`;
            
const newResponse = `            if (res.ok && data.text) {
                this.appendMessage(data.text, false);
                this.history.push({ role: "model", text: data.text });
                if (data.usage && data.usage.totalTokenCount && this.tokenUsageEl) {
                    this.tokenUsageEl.innerText = data.usage.totalTokenCount.toLocaleString();
                }
            } else {`;
            
code = code.replace(oldResponse, newResponse);

fs.writeFileSync('scripts/components/interaction/aiManager.js', code);
console.log('Fixed aiManager.js');
