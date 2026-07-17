const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

// Insert the AI button
if (!code.includes('btn-ai')) {
  code = code.replace(
    /<button id="btn-analytics" class="btn btn-icon js-open-analytics" title="Аналітика">/,
    `<button id="btn-ai" class="btn btn-icon js-open-ai" title="AI Асистент"><i class="ri-robot-2-line"></i></button>
                <button id="btn-analytics" class="btn btn-icon js-open-analytics" title="Аналітика">`
  );
}

// Insert the AI popup HTML
if (!code.includes('id="ai-overlay"')) {
  const popupHtml = `
        <!-- AI Popup -->
        <div id="ai-overlay" class="popup-overlay hidden" aria-hidden="true">
            <div class="popup-content popup-content--ai" style="width: 90%; max-width: 600px; height: 80vh; display: flex; flex-direction: column;">
                <div class="popup-header">
                    <h2 class="popup-title"><i class="ri-robot-2-line" style="margin-right:8px;"></i> AI Асистент</h2>
                    <button class="btn-close js-close-popup" aria-label="Закрити"></button>
                </div>
                <div class="popup-body" style="flex: 1; overflow: hidden; display: flex; flex-direction: column; padding: 0;">
                    <div id="ai-chat-messages" style="flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; background: var(--color-bg-body);">
                        <div style="background: var(--color-bg-card); padding: 12px 16px; border-radius: 12px; border: 1px solid var(--color-border); align-self: flex-start; max-width: 85%;">
                            Привіт! Я ваш персональний асистент з генеалогії. Чим можу допомогти у ваших дослідженнях?
                        </div>
                    </div>
                    <div style="padding: 12px 16px; background: var(--color-bg-card); border-top: 1px solid var(--color-border); display: flex; gap: 8px;">
                        <input type="text" id="ai-chat-input" placeholder="Запитайте щось про родовід..." style="flex: 1; padding: 10px 14px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-bg-body); color: var(--color-text-main); font-size: 15px;" />
                        <button id="ai-chat-send" class="btn" style="background: var(--color-primary); color: white; border: none; border-radius: 8px; width: 42px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                            <i class="ri-send-plane-2-fill"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
`;
  // Append right before </body> or right after <div id="share-overlay" ... </div> 
  // Let's insert it before the closing </main> or </body>
  code = code.replace('</body>', popupHtml + '\n</body>');
}

fs.writeFileSync('index.html', code);
console.log('Added AI button and popup to index.html');
