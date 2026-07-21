const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const oldBtn = `<button id="btn-back-to-summary" class="btn btn-outline" style="border-radius: 20px; padding: 6px 16px;">
                                <i class="ri-arrow-left-line" style="margin-right: 8px;"></i> Назад
                            </button>`;
const newBtn = `<button id="btn-back-to-summary" class="btn" style="background: transparent; border: none; padding: 0; box-shadow: none; color: var(--color-text-main); font-weight: 500; height: auto;">
                                <i class="ri-arrow-left-line" style="margin-right: 4px;"></i> Назад
                            </button>`;

if (html.includes(oldBtn)) {
    html = html.replace(oldBtn, newBtn);
    fs.writeFileSync('index.html', html);
    console.log('Replaced back button.');
} else {
    console.log('Back button not found.');
}
