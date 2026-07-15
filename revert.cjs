const fs = require('fs');
const file = 'scripts/components/interaction/analyticsManager.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `                        <div style="display: flex; gap: 40px; align-items: flex-start; position: relative; width: 100%;">
                            <aside class="profile-sidebar" style="position: sticky; top: 90px; left: auto; margin-top: 24px; flex-shrink: 0; width: 150px;">
                                <div class="profile-toc-container">
                                    <h3 class="profile-toc-title">Місяці</h3>
                                    <ul class="profile-toc-list">
                                        \${tocLinksHtml}
                                    </ul>
                                </div>
                            </aside>
                            <div style="flex: 1; min-width: 0;">
                                <ul id="analytics-events-list" class="analytics-list-none" style="padding: 0; margin: 0;">
                                    \${html}
                                </ul>
                            </div>
                        </div>`;

const replacementStr = `                        <div class="profile-layout-with-sidebar">
                            <aside class="profile-sidebar">
                                <div class="profile-toc-container">
                                    <h3 class="profile-toc-title">Місяці</h3>
                                    <ul class="profile-toc-list">
                                        \${tocLinksHtml}
                                    </ul>
                                </div>
                            </aside>
                            <div class="profile-body-blocks">
                                <ul id="analytics-events-list" class="analytics-list-none" style="padding: 0; margin: 0;">
                                    \${html}
                                </ul>
                            </div>
                        </div>`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(file, content);
console.log('Reverted');
