const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/aiManager.js', 'utf8');

const oldCode = `    appendMessage(text, isUser = false) {
        if (!this.messagesContainer) return;
        const msgDiv = document.createElement("div");
        msgDiv.style.padding = "12px 16px";
        msgDiv.style.borderRadius = "12px";
        msgDiv.style.border = "1px solid var(--color-border)";
        msgDiv.style.alignSelf = isUser ? "flex-end" : "flex-start";
        msgDiv.style.maxWidth = "85%";
        msgDiv.style.background = isUser ? "var(--color-primary)" : "var(--color-bg-card)";
        msgDiv.style.color = isUser ? "#fff" : "inherit";
        msgDiv.innerHTML = text.replace(/\\n/g, "<br>");
        this.messagesContainer.appendChild(msgDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }`;

const newCode = `    appendMessage(text, isUser = false) {
        if (!this.messagesContainer) return;
        const msgDiv = document.createElement("div");
        msgDiv.style.padding = "12px 16px";
        msgDiv.style.borderRadius = "12px";
        msgDiv.style.border = "1px solid var(--color-border)";
        msgDiv.style.alignSelf = isUser ? "flex-end" : "flex-start";
        msgDiv.style.maxWidth = "85%";
        msgDiv.style.background = isUser ? "var(--color-primary)" : "var(--color-bg-card)";
        msgDiv.style.color = isUser ? "#fff" : "inherit";
        msgDiv.style.wordBreak = "break-word";
        msgDiv.style.overflowWrap = "break-word";
        
        let formattedText = text;
        if (!isUser) {
            formattedText = formattedText.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
            formattedText = formattedText.replace(/\\[([^\\]]+)\\]\\((https?:\\/\\/[^\\)]+)\\)/g, '<a href="$2" target="_blank" style="text-decoration: underline; color: var(--color-primary);">$1</a>');
            formattedText = formattedText.replace(/^([\\*\\-])\\s+(.*)$/gm, '&bull; $2');
            formattedText = formattedText.replace(/(?<!\\*)\\*(?!\\*)(.*?)(?<!\\*)\\*(?!\\*)/g, '<em>$1</em>');
        }

        msgDiv.innerHTML = formattedText.replace(/\\n/g, "<br>");
        this.messagesContainer.appendChild(msgDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }`;

code = code.replace(oldCode, newCode);

fs.writeFileSync('scripts/components/interaction/aiManager.js', code);
console.log('Fixed aiManager.js markdown & word-wrap');
