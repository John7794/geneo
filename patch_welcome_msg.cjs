const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/aiManager.js', 'utf8');

const oldWelcome = `    clearChat() {
        this.history = [];
        if (this.messagesContainer) {
            this.messagesContainer.innerHTML = \`<div style="background: var(--color-bg-card); padding: 12px 16px; border-radius: 12px; border: 1px solid var(--color-border); align-self: flex-start; max-width: 85%;">
                Привіт! Я ваш персональний асистент з генеалогії. Чим можу допомогти у ваших дослідженнях?
            </div>\`;
        }`;

const newWelcome = `    clearChat() {
        this.history = [];
        if (this.messagesContainer) {
            this.messagesContainer.innerHTML = \`<div style="background: var(--color-bg-card); padding: 12px 16px; border-radius: 12px; border: 1px solid var(--color-border); align-self: flex-start; max-width: 85%; word-break: break-word; overflow-wrap: break-word;">
                Привіт! Я ваш персональний асистент з генеалогії. Чим можу допомогти у ваших дослідженнях?
            </div>\`;
        }`;

code = code.replace(oldWelcome, newWelcome);
fs.writeFileSync('scripts/components/interaction/aiManager.js', code);
console.log('Fixed welcome message style');
