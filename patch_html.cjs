const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const oldHtml = `<div style="background: var(--color-bg-card); padding: 12px 16px; border-radius: 12px; border: 1px solid var(--color-border); align-self: flex-start; max-width: 85%;">
                            Привіт! Я ваш персональний асистент з генеалогії. Чим можу допомогти у ваших дослідженнях?
                        </div>`;
const newHtml = `<div style="background: var(--color-bg-card); padding: 12px 16px; border-radius: 12px; border: 1px solid var(--color-border); align-self: flex-start; max-width: 85%; word-break: break-word; overflow-wrap: break-word;">
                            Привіт! Я ваш персональний асистент з генеалогії. Чим можу допомогти у ваших дослідженнях?
                        </div>`;

html = html.replace(oldHtml, newHtml);
fs.writeFileSync('index.html', html);
console.log('Fixed index.html welcome message');
