const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const oldHtml = `<div class="popup-content popup-content--ai" style="width: 90%; max-width: 600px; height: 80vh; display: flex; flex-direction: column;">
                <div class="popup-header">
                    <h2 class="popup-title"><i class="ri-robot-2-line" style="margin-right:8px;"></i> AI Асистент</h2>
                    <button class="btn-close js-close-popup" aria-label="Закрити"></button>
                </div>`;

const newHtml = `<div class="popup-container" style="width: 90%; max-width: 600px; height: 80vh; display: flex; flex-direction: column;">
                <div class="popup-close-pos">
                    <button class="modal-close js-close-popup" aria-label="Закрити" title="Закрити"><i class="ri-close-line"></i></button>
                </div>
                <div class="popup-header" style="padding: 16px; border-bottom: 1px solid var(--color-border);">
                    <h2 class="popup-title" style="margin: 0; font-size: 20px;"><i class="ri-robot-2-line" style="margin-right:8px;"></i> AI Асистент</h2>
                </div>`;

code = code.replace(oldHtml, newHtml);
fs.writeFileSync('index.html', code);
console.log('Fixed AI overlay HTML structure');
