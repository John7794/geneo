const fs = require('fs');
const file = '/app/applet/scripts/components/interaction/analyticsManager.js';
let content = fs.readFileSync(file, 'utf8');

const target = `                                    const peopleHtml = peopleList.length > 0 
                                        ? \`<ul style="list-style: none; padding-left: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;">
                                            \${peopleList.map(personName => \`
                                            <li style="list-style: none; display: flex; align-items: flex-start; gap: 8px; margin-left: 12px;">
                                                <div style="width: 6px; height: 6px; border-radius: 50%; background: var(--color-primary); margin-top: 8px; flex-shrink: 0;"></div>
                                                <div style="flex: 1;">
                                                    <div style="font-size: 15px; color: var(--color-text-main);">\${personName}</div>
                                                </div>
                                            </li>\`).join("")}
                                          </ul>\` 
                                        : "";`;

const replacement = `                                    const peopleHtml = peopleList.length > 0 
                                        ? \`<ul style="list-style: none; padding-left: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;">
                                            \${peopleList.map(personName => \`
                                            <li style="padding: 12px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 8px; list-style: none; margin-left: 12px;">
                                                <div style="font-size: 15px; color: var(--color-text-main); line-height: 1.4;">
                                                    \${personName}
                                                </div>
                                            </li>\`).join("")}
                                          </ul>\` 
                                        : "";`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log("Replaced places list style!");
