const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const replacement = `<div id="analytics-content" class="analytics-content">
                        <!-- Summary Dashboard -->
                        <div id="analytics-summary" style="display: flex; flex-direction: column; gap: 24px;"></div>
                        
                        <div style="display: flex; justify-content: center; margin: 20px 0;">
                            <button id="btn-toggle-analytics-details" class="btn btn-outline" style="border-radius: 20px; padding: 8px 24px;">Детальна статистика <i class="ri-arrow-down-s-line" style="margin-left: 8px;"></i></button>
                        </div>

                        <!-- Detailed Stats -->
                        <div id="analytics-detailed-view" style="display: none; flex-direction: column; gap: 24px;">
						<!-- General Stats -->`;

html = html.replace(`<div id="analytics-content" class="analytics-content">
						<!-- General Stats -->`, replacement);

html = html.replace(`<!-- Religions -->`, `<!-- Religions -->
                        </div>`);

fs.writeFileSync('index.html', html);
console.log("index.html patched.");
