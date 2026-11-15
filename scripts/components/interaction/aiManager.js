/**
 * AI Assistant Manager for Geneo
 * Features:
 *  - Chat interface with smart context retrieval (RAG)
 *  - Dynamic Model & API key settings
 *  - Context person binding with tree integration
 *  - Chat export & clear history
 *  - Quick prompt starters
 *  - Copy to clipboard & regenerate responses
 *  - Auto-resizing textarea & responsive UI
 */

export class AIManager {
    constructor(options = {}) {
        this.getEngine = options.getEngine || (() => null);
        this.getCurrentProfileId = options.getCurrentProfileId || (() => null);
        this.onNavigatePerson = options.onNavigatePerson || (() => null);

        // Core DOM Elements
        this.btnOpen = document.getElementById("btn-ai");
        this.overlay = document.getElementById("ai-overlay");
        this.btnClose = document.getElementById("btn-close-ai") || (this.overlay ? this.overlay.querySelector(".js-close-popup") : null);
        this.messagesContainer = document.getElementById("ai-chat-messages");
        this.quickStarters = document.getElementById("ai-quick-starters");
        this.input = document.getElementById("ai-chat-input");
        this.btnSend = document.getElementById("ai-chat-send");
        this.btnClear = document.getElementById("ai-chat-clear");
        this.tokenUsageEl = document.getElementById("ai-token-usage");
        this.modelBadge = document.getElementById("ai-footer-model-name");

        // Controls: Settings & Drawer
        this.btnToggleSettings = document.getElementById("btn-ai-toggle-settings");
        this.btnExportChat = document.getElementById("btn-ai-export-chat");
        this.settingsDrawer = document.getElementById("ai-settings-drawer");
        this.selectModel = document.getElementById("ai-select-model");
        this.inputApiKey = document.getElementById("ai-input-api-key");
        this.btnSaveSettings = document.getElementById("btn-ai-save-settings");
        this.btnCloseSettings = document.getElementById("btn-ai-close-settings");

        // Context Strip
        this.contextStrip = document.getElementById("ai-context-strip");
        this.contextName = document.getElementById("ai-context-name");
        this.btnClearContext = document.getElementById("btn-ai-clear-context");

        // State
        this.history = [];
        this.activeProfileId = null;
        this.isGenerating = false;
        this.selectedModel = localStorage.getItem("geneo_ai_model") || "gemini-2.5-flash";
        this.customApiKey = localStorage.getItem("geneo_ai_custom_key") || "";

        this.init();
    }

    init() {
        if (!this.overlay) return;

        // Open & Close
        if (this.btnOpen) {
            this.btnOpen.addEventListener("click", () => this.open());
        }
        if (this.btnClose) {
            this.btnClose.addEventListener("click", () => this.close());
        }
        this.overlay.addEventListener("click", (e) => {
            if (e.target === this.overlay) this.close();
        });

        // ESC key to close
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this.isOpen()) {
                this.close();
            }
        });

        // Send & Input
        if (this.btnSend) {
            this.btnSend.addEventListener("click", () => this.sendMessage());
        }
        if (this.input) {
            this.input.addEventListener("keydown", (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            this.input.addEventListener("input", () => this.autoResizeInput());
        }

        // Clear Chat
        if (this.btnClear) {
            this.btnClear.addEventListener("click", () => this.clearChat());
        }

        // Export Chat
        if (this.btnExportChat) {
            this.btnExportChat.addEventListener("click", () => this.exportChat());
        }

        // Settings Drawer
        if (this.btnToggleSettings) {
            this.btnToggleSettings.addEventListener("click", () => this.toggleSettings());
        }
        if (this.btnSaveSettings) {
            this.btnSaveSettings.addEventListener("click", () => this.saveSettings());
        }
        if (this.btnCloseSettings) {
            this.btnCloseSettings.addEventListener("click", () => this.toggleSettings(false));
        }

        // Context Clear / Unlink
        if (this.btnClearContext) {
            this.btnClearContext.addEventListener("click", () => this.clearContext());
        }

        // Quick Starter Chips
        if (this.quickStarters) {
            this.quickStarters.addEventListener("click", (e) => {
                const chip = e.target.closest(".ai-starter-chip");
                if (chip) {
                    const prompt = chip.getAttribute("data-prompt") || chip.innerText.trim();
                    if (prompt) {
                        this.sendMessage(prompt);
                    }
                }
            });
        }

        // Message person links delegation
        if (this.messagesContainer) {
            this.messagesContainer.addEventListener("click", (e) => {
                const link = e.target.closest(".ai-person-nav-link");
                if (link) {
                    e.preventDefault();
                    const id = link.getAttribute("data-id");
                    if (id && this.onNavigatePerson) {
                        this.onNavigatePerson(id);
                        this.close();
                    }
                }
            });
        }

        // Apply initial settings in UI
        this.applySettingsToUI();
    }

    isOpen() {
        return this.overlay && this.overlay.classList.contains("show");
    }

    open() {
        if (!this.overlay) return;
        this.overlay.classList.remove("hidden");
        this.overlay.classList.add("show");
        this.overlay.setAttribute("aria-hidden", "false");

        // Sync context with current viewed profile
        this.syncContext();

        // Focus input
        setTimeout(() => {
            if (this.input) {
                this.input.focus();
                this.autoResizeInput();
            }
        }, 100);
    }

    close() {
        if (!this.overlay) return;
        this.overlay.classList.add("hidden");
        this.overlay.classList.remove("show");
        this.overlay.setAttribute("aria-hidden", "true");
        if (this.settingsDrawer) {
            this.settingsDrawer.classList.add("hidden");
        }
    }

    syncContext() {
        const currentId = this.getCurrentProfileId ? this.getCurrentProfileId() : null;
        if (currentId) {
            this.activeProfileId = currentId;
            let name = `ID: ${currentId}`;
            const engine = this.getEngine ? this.getEngine() : null;
            if (engine && engine.people && engine.people.has(currentId)) {
                const p = engine.people.get(currentId);
                const fullName = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ");
                if (fullName) {
                    name = `${fullName} (ID: ${currentId})`;
                }
            }
            if (this.contextName) {
                this.contextName.textContent = `Контекст: ${name}`;
            }
            if (this.contextStrip) {
                this.contextStrip.classList.remove("hidden");
            }
        } else {
            this.clearContext();
        }
    }

    clearContext() {
        this.activeProfileId = null;
        if (this.contextStrip) {
            this.contextStrip.classList.add("hidden");
        }
    }

    autoResizeInput() {
        if (!this.input) return;
        this.input.style.height = "auto";
        const newHeight = Math.min(this.input.scrollHeight, 120);
        this.input.style.height = `${Math.max(42, newHeight)}px`;
    }

    toggleSettings(force) {
        if (!this.settingsDrawer) return;
        const willShow = typeof force === "boolean" ? force : this.settingsDrawer.classList.contains("hidden");
        if (willShow) {
            this.settingsDrawer.classList.remove("hidden");
            if (this.selectModel) this.selectModel.value = this.selectedModel;
            if (this.inputApiKey) this.inputApiKey.value = this.customApiKey;
        } else {
            this.settingsDrawer.classList.add("hidden");
        }
    }

    applySettingsToUI() {
        if (this.modelBadge) {
            this.modelBadge.textContent = this.selectedModel;
        }
        if (this.selectModel) {
            this.selectModel.value = this.selectedModel;
        }
        if (this.inputApiKey) {
            this.inputApiKey.value = this.customApiKey;
        }
    }

    saveSettings() {
        if (this.selectModel) {
            this.selectedModel = this.selectModel.value || "gemini-2.5-flash";
            localStorage.setItem("geneo_ai_model", this.selectedModel);
        }
        if (this.inputApiKey) {
            this.customApiKey = this.inputApiKey.value.trim();
            if (this.customApiKey) {
                localStorage.setItem("geneo_ai_custom_key", this.customApiKey);
            } else {
                localStorage.removeItem("geneo_ai_custom_key");
            }
        }
        this.applySettingsToUI();
        this.toggleSettings(false);
    }

    clearChat() {
        this.history = [];
        if (this.messagesContainer) {
            this.messagesContainer.innerHTML = `
                <div class="ai-bubble model">
                    Привіт! Я ваш персональний асистент з генеалогії Geneo. Чим можу допомогти у ваших родинних дослідженнях?
                </div>
            `;
            // Re-append quick starters
            if (this.quickStarters) {
                this.messagesContainer.appendChild(this.quickStarters);
                this.quickStarters.style.display = "flex";
            }
        }
        if (this.tokenUsageEl) {
            this.tokenUsageEl.innerText = "0";
        }
    }

    exportChat() {
        if (this.history.length === 0) {
            alert("Історія чату порожня.");
            return;
        }

        const dateStr = new Date().toLocaleString("uk-UA");
        let content = `========================================\nGENEO AI ASSISTANT - ІСТОРІЯ ДІАЛОГУ\nДата: ${dateStr}\nМодель: ${this.selectedModel}\n========================================\n\n`;

        this.history.forEach((msg) => {
            const sender = msg.role === "user" ? "ДОСЛІДНИК" : "GENEO AI";
            content += `[${sender}]:\n${msg.text}\n\n----------------------------------------\n\n`;
        });

        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `geneo-ai-chat-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    formatMarkdown(text) {
        if (!text) return "";
        let out = text;

        // Escape HTML
        out = out.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        // Code blocks: ```code```
        out = out.replace(/```([\s\S]*?)```/g, '<pre style="background: rgba(0,0,0,0.06); padding: 8px; border-radius: 6px; overflow-x: auto; font-size: 12px;"><code>$1</code></pre>');

        // Bold: **text**
        out = out.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

        // Italic: *text*
        out = out.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");

        // Inline code: `text`
        out = out.replace(/`([^`]+)`/g, '<code style="background: rgba(0,0,0,0.06); padding: 2px 4px; border-radius: 4px; font-size: 12px;">$1</code>');

        // Links: [text](url)
        out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: var(--color-primary); text-decoration: underline;">$1</a>');

        // Bullet lists: * or -
        out = out.replace(/^[\*\-]\s+(.*)$/gm, '<li style="margin-left: 18px;">$1</li>');

        // Highlight genealogical person IDs like ID: 57 or ID 57
        out = out.replace(/\bID:?\s*(\d+)\b/g, (match, id) => {
            return `<a href="#" class="ai-person-nav-link" data-id="${id}" style="color: var(--color-primary); font-weight: 600; text-decoration: underline;" title="Перейти до персони в дереві">ID: ${id}</a>`;
        });

        // Convert newlines to <br> (avoiding duplicate breaks inside <li>)
        out = out.replace(/\n/g, "<br>");
        out = out.replace(/(<\/li>)<br>/g, "$1");

        return out;
    }

    appendMessage(text, role = "model", isError = false) {
        if (!this.messagesContainer) return null;

        const isUser = role === "user";
        const bubble = document.createElement("div");
        bubble.className = `ai-bubble ${isUser ? "user" : "model"} ${isError ? "error-bubble" : ""}`;

        if (isUser) {
            bubble.textContent = text;
        } else {
            const contentDiv = document.createElement("div");
            contentDiv.innerHTML = this.formatMarkdown(text);
            bubble.appendChild(contentDiv);

            // Add Actions Toolbar for Model responses
            const actionsDiv = document.createElement("div");
            actionsDiv.className = "ai-bubble-actions";

            // Copy button
            const btnCopy = document.createElement("button");
            btnCopy.type = "button";
            btnCopy.className = "ai-action-btn";
            btnCopy.innerHTML = '<i class="ri-file-copy-line"></i> Скопіювати';
            btnCopy.addEventListener("click", () => {
                navigator.clipboard.writeText(text).then(() => {
                    btnCopy.innerHTML = '<i class="ri-check-line" style="color:#10b981;"></i> Скопійовано';
                    setTimeout(() => {
                        btnCopy.innerHTML = '<i class="ri-file-copy-line"></i> Скопіювати';
                    }, 2000);
                });
            });
            actionsDiv.appendChild(btnCopy);

            // If error, add retry button
            if (isError) {
                const btnRetry = document.createElement("button");
                btnRetry.type = "button";
                btnRetry.className = "ai-action-btn retry-btn";
                btnRetry.innerHTML = '<i class="ri-restart-line"></i> Спробувати знову';
                btnRetry.addEventListener("click", () => {
                    const lastUserMsg = [...this.history].reverse().find((m) => m.role === "user");
                    if (lastUserMsg) {
                        this.sendMessage(lastUserMsg.text);
                    }
                });
                actionsDiv.appendChild(btnRetry);
            }

            bubble.appendChild(actionsDiv);
        }

        // Hide quick starters after first real message
        if (this.quickStarters && this.history.length > 0) {
            this.quickStarters.style.display = "none";
        }

        this.messagesContainer.appendChild(bubble);
        this.scrollToBottom();
        return bubble;
    }

    scrollToBottom() {
        if (!this.messagesContainer) return;
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    async sendMessage(overrideText = null) {
        if (this.isGenerating) return;

        const text = overrideText !== null ? overrideText.trim() : (this.input ? this.input.value.trim() : "");
        if (!text) return;

        if (this.input && overrideText === null) {
            this.input.value = "";
            this.autoResizeInput();
        }

        this.isGenerating = true;
        if (this.btnSend) this.btnSend.disabled = true;
        if (this.input) this.input.disabled = true;

        // Append user message
        this.appendMessage(text, "user");
        this.history.push({ role: "user", text: text });

        // Add typing loader
        const loaderId = "ai-loader-" + Date.now();
        const loaderBubble = document.createElement("div");
        loaderBubble.id = loaderId;
        loaderBubble.className = "ai-bubble model";
        loaderBubble.innerHTML = `
            <div class="ai-typing-loader">
                <span style="font-size: 13px; color: var(--color-text-muted); margin-right: 4px;">Шукаю в родинному дереві</span>
                <span class="ai-typing-dot"></span>
                <span class="ai-typing-dot"></span>
                <span class="ai-typing-dot"></span>
            </div>
        `;
        this.messagesContainer.appendChild(loaderBubble);
        this.scrollToBottom();

        try {
            const token = localStorage.getItem("auth_token") || "";
            const headers = {
                "Content-Type": "application/json",
                ...(token ? { Authorization: "Bearer " + token } : {}),
                ...(this.selectedModel ? { "x-gemini-model": this.selectedModel } : {}),
                ...(this.customApiKey ? { "x-gemini-api-key": this.customApiKey } : {})
            };

            const payload = {
                prompt: text,
                history: this.history.slice(0, -1),
                currentProfileId: this.activeProfileId || (this.getCurrentProfileId ? this.getCurrentProfileId() : null)
            };

            const response = await fetch("/api/gemini/chat", {
                method: "POST",
                headers: headers,
                credentials: "include",
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            // Remove loader
            const existingLoader = document.getElementById(loaderId);
            if (existingLoader) existingLoader.remove();

            if (response.ok && data.text) {
                this.appendMessage(data.text, "model", false);
                this.history.push({ role: "model", text: data.text });

                if (data.usage && data.usage.totalTokenCount && this.tokenUsageEl) {
                    this.tokenUsageEl.innerText = Number(data.usage.totalTokenCount).toLocaleString("uk-UA");
                }
            } else {
                const errMsg = data.error || (data.details ? `${data.details}` : "Невідома помилка сервера");
                this.appendMessage(`⚠️ Помилка отримання відповіді: ${errMsg}. Ви можете змінити модель у налаштуваннях (⚙️) або використати власний API ключ Google AI Studio.`, "model", true);
            }
        } catch (err) {
            const existingLoader = document.getElementById(loaderId);
            if (existingLoader) existingLoader.remove();

            this.appendMessage("⚠️ Помилка з'єднання з сервером. Перевірте підключення до мережі або спробуйте пізніше.", "model", true);
        } finally {
            this.isGenerating = false;
            if (this.btnSend) this.btnSend.disabled = false;
            if (this.input) {
                this.input.disabled = false;
                this.input.focus();
            }
        }
    }
}
