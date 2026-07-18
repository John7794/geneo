export class AIManager {
    constructor() {
        this.btnOpen = document.getElementById("btn-ai");
        this.overlay = document.getElementById("ai-overlay");
        this.btnClose = this.overlay ? this.overlay.querySelector(".js-close-popup") : null;
        this.input = document.getElementById("ai-chat-input");
        this.btnSend = document.getElementById("ai-chat-send");
        this.messagesContainer = document.getElementById("ai-chat-messages");
        this.btnClear = document.getElementById("ai-chat-clear");
        this.tokenUsageEl = document.getElementById("ai-token-usage");
        this.history = [];
        
        this.init();
    }

    init() { console.log("AIManager init:", !!this.btnOpen, !!this.overlay);
        if (!this.btnOpen || !this.overlay) return;

        this.btnOpen.addEventListener("click", () => { console.log("AI btn clicked!"); this.open(); });
        if (this.btnClose) {
            this.btnClose.addEventListener("click", () => this.close());
        }
        this.overlay.addEventListener("click", (e) => {
            if (e.target === this.overlay) this.close();
        });

        if (this.btnSend) {
            this.btnSend.addEventListener("click", () => this.sendMessage());
        }
        if (this.input) {
            this.input.addEventListener("keypress", (e) => {
                if (e.key === "Enter") this.sendMessage();
            });
        }
        if (this.btnClear) {
            this.btnClear.addEventListener("click", () => this.clearChat());
        }
    }

    open() {
        this.overlay.classList.remove("hidden"); this.overlay.classList.add("show");
        this.overlay.setAttribute("aria-hidden", "false");
        if (this.input) this.input.focus();
    }

    close() {
        this.overlay.classList.add("hidden"); this.overlay.classList.remove("show");
        this.overlay.setAttribute("aria-hidden", "true");
    }

    clearChat() {
        this.history = [];
        if (this.messagesContainer) {
            this.messagesContainer.innerHTML = `<div style="background: var(--color-bg-card); padding: 12px 16px; border-radius: 12px; border: 1px solid var(--color-border); align-self: flex-start; max-width: 85%; word-break: break-word; overflow-wrap: break-word;">
                Привіт! Я ваш персональний асистент з генеалогії. Чим можу допомогти у ваших дослідженнях?
            </div>`;
        }
        if (this.tokenUsageEl) {
            this.tokenUsageEl.innerText = "0";
        }
    }

    appendMessage(text, isUser = false) {
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
            formattedText = formattedText.replace(/#/g, '');
            formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            formattedText = formattedText.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" style="text-decoration: underline; color: var(--color-primary);">$1</a>');
            formattedText = formattedText.replace(/^([\*\-])\s+(.*)$/gm, '&bull; $2');
            formattedText = formattedText.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
        }

        msgDiv.innerHTML = formattedText.replace(/\n/g, "<br>");
        this.messagesContainer.appendChild(msgDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    async sendMessage() {
        if (!this.input || !this.input.value.trim()) return;
        const text = this.input.value.trim();
        this.input.value = "";
        
        this.appendMessage(text, true);
        this.history.push({ role: "user", text: text });
        
        const typingId = "typing-" + Date.now();
        const typingDiv = document.createElement("div");
        typingDiv.id = typingId;
        typingDiv.style.padding = "12px 16px";
        typingDiv.style.borderRadius = "12px";
        typingDiv.style.border = "1px solid var(--color-border)";
        typingDiv.style.alignSelf = "flex-start";
        typingDiv.style.background = "var(--color-bg-card)";
        typingDiv.innerHTML = "<span style='opacity:0.6'>Зачекайте...</span>";
        this.messagesContainer.appendChild(typingDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

        try {
            const currentUrl = new URL(window.location);
            const currentId = currentUrl.searchParams.get("id");
            
            const res = await fetch("/api/gemini/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    prompt: text, 
                    history: this.history.slice(0, -1),
                    currentProfileId: currentId
                })
            });
            const data = await res.json();
            
            const el = document.getElementById(typingId);
            if (el) el.remove();
            
            if (res.ok && data.text) {
                this.appendMessage(data.text, false);
                this.history.push({ role: "model", text: data.text });
                if (data.usage && data.usage.totalTokenCount && this.tokenUsageEl) {
                    this.tokenUsageEl.innerText = data.usage.totalTokenCount.toLocaleString();
                }
            } else {
                this.appendMessage("Вибачте, сталася помилка: " + (data.error || "Невідома помилка"), false);
            }
        } catch (e) {
            const el = document.getElementById(typingId);
            if (el) el.remove();
            this.appendMessage("Вибачте, сталася помилка мережі.", false);
        }
    }
}
