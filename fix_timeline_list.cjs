const fs = require('fs');
const file = '/app/applet/scripts/components/interaction/analyticsManager.js';
let content = fs.readFileSync(file, 'utf8');

const target = `                                <li style="list-style: none; display: flex; align-items: flex-start; gap: 8px;">
                                    <div style="width: 6px; height: 6px; border-radius: 50%; background: var(--color-primary); margin-top: 8px; flex-shrink: 0;"></div>
                                    <div style="flex: 1;">
                                        <div style="font-size: 15px; color: var(--color-text-main); line-height: 1.4;">
                                            \${namesStr}
                                        </div>
                                        <div style="font-size: 13px; color: var(--color-text-muted); margin-top: 2px;">
                                            \${dateStr}\${placeStr}
                                        </div>
                                    </div>
                                </li>`;

const replacement = `                                <li style="padding: 12px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 8px; list-style: none;">
                                    <div style="flex: 1;">
                                        <div style="font-size: 15px; color: var(--color-text-main); line-height: 1.4;">
                                            \${namesStr}
                                        </div>
                                        <div style="font-size: 13px; color: var(--color-text-muted); margin-top: 2px;">
                                            \${dateStr}\${placeStr}
                                        </div>
                                    </div>
                                </li>`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log("Replaced timeline list style!");
