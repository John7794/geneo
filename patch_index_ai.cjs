const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const oldHeader = `<div class="popup-header" style="padding: 16px; border-bottom: 1px solid var(--color-border);">
                    <h2 class="popup-title" style="margin: 0; font-size: 20px;"><i class="ri-robot-2-line" style="margin-right:8px;"></i> AI Асистент</h2>
                </div>`;
const newHeader = `<div class="popup-header" style="padding: 16px; border-bottom: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center; padding-right: 48px;">
                    <h2 class="popup-title" style="margin: 0; font-size: 20px;"><i class="ri-robot-2-line" style="margin-right:8px;"></i> AI Асистент</h2>
                    <button id="ai-chat-clear" class="btn btn-outline" style="padding: 4px 12px; font-size: 13px; border-radius: 4px; display: flex; align-items: center; gap: 4px; background: transparent; border: 1px solid var(--color-border); color: var(--color-text-main); cursor: pointer;">
                        <i class="ri-delete-bin-line"></i> Очистити
                    </button>
                </div>`;
code = code.replace(oldHeader, newHeader);

const oldFooter = `<div style="padding: 12px 16px; background: var(--color-bg-card); border-top: 1px solid var(--color-border); display: flex; gap: 8px;">
                        <input type="text" id="ai-chat-input" placeholder="Запитайте щось про родовід..." style="flex: 1; padding: 10px 14px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-bg-body); color: var(--color-text-main); font-size: 15px;" />
                        <button id="ai-chat-send" class="btn" style="background: var(--color-primary); color: white; border: none; border-radius: 8px; width: 42px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                            <i class="ri-send-plane-2-fill"></i>
                        </button>
                    </div>`;

const newFooter = `<div style="padding: 12px 16px; background: var(--color-bg-card); border-top: 1px solid var(--color-border); display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; gap: 8px;">
                            <input type="text" id="ai-chat-input" placeholder="Запитайте щось про родовід..." style="flex: 1; padding: 10px 14px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-bg-body); color: var(--color-text-main); font-size: 15px;" />
                            <button id="ai-chat-send" class="btn" style="background: var(--color-primary); color: white; border: none; border-radius: 8px; width: 42px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                                <i class="ri-send-plane-2-fill"></i>
                            </button>
                        </div>
                        <div style="font-size: 11px; color: var(--color-text-muted); text-align: right;">
                            Використано токенів: <span id="ai-token-usage">0</span> / ~1,000,000
                        </div>
                    </div>`;

code = code.replace(oldFooter, newFooter);

fs.writeFileSync('index.html', code);
console.log('Fixed index.html AI section');
