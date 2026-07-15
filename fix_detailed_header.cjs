const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const regex = /<div style="display: flex; align-items: center; gap: 16px; margin-bottom: 8px;">\s*<button id="btn-back-to-summary"[^>]*>[\s\S]*?<\/button>\s*<h3 id="detailed-view-title"[^>]*>Деталі<\/h3>\s*<\/div>/m;

const newStr = `<div id="detailed-view-header" style="display: flex; align-items: center; gap: 16px; margin-bottom: 8px; position: sticky; top: 65px; background: var(--color-bg); z-index: 9; padding: 16px 0; border-bottom: 1px solid var(--color-border); margin-top: -16px;">
                            <button id="btn-back-to-summary" class="btn btn-outline" style="border-radius: 20px; padding: 6px 16px;">
                                <i class="ri-arrow-left-line" style="margin-right: 8px;"></i> Назад
                            </button>
                            <h3 id="detailed-view-title" style="margin: 0; font-size: 18px; color: var(--color-text-main);">Деталі</h3>
                        </div>`;

if (regex.test(code)) {
    code = code.replace(regex, newStr);
    fs.writeFileSync('index.html', code);
    console.log("Success replacing detailed view header");
} else {
    console.log("Failed to find regex");
}
