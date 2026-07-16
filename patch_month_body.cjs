const fs = require('fs');
const file = 'scripts/components/interaction/analyticsManager.js';
let content = fs.readFileSync(file, 'utf8');

let targetStr = `                            <div class="analytics-event-month-body" style="display: block; padding-top: 8px;">
                    \`;`;

let replacementStr = `                            <div class="analytics-event-month-body" style="display: block; padding-top: 8px;">
                                <ul style="list-style: none; padding: 0; margin: 0;">
                    \`;`;
content = content.replace(targetStr, replacementStr);

targetStr = `                    html += \`
                            </div>
                        </li>
                    \`;
                });`;

replacementStr = `                    html += \`
                                </ul>
                            </div>
                        </li>
                    \`;
                });`;

content = content.replace(targetStr, replacementStr);

fs.writeFileSync(file, content);
console.log('Month body patched!');
