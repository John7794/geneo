const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const targetStr = `                        if (evt.gregorian.year && !isNaN(evt.gregorian.year)) {
                            const c = Math.ceil(evt.gregorian.year / 100);
                            const c = Math.ceil(y / 100);
                            if (c !== currentCentury) {
                                currentCentury = c;
                                html += \`
                                    <li style="list-style: none; margin-top: 16px; margin-bottom: 8px;">
                                        <div style="margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text-main); background: var(--color-bg-sub); padding: 4px 12px; border-radius: 4px; display: inline-block;">\${getCenturyRoman(currentCentury)} століття</div>
                                    </li>
                                \`;
                            }
                        }`;

const replaceStr = `                        if (evt.gregorian.year && !isNaN(evt.gregorian.year)) {
                            const cent = Math.ceil(evt.gregorian.year / 100);
                            if (cent !== currentCentury) {
                                currentCentury = cent;
                                html += \`
                                    <li style="list-style: none; margin-top: 16px; margin-bottom: 8px;">
                                        <div style="margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text-main); background: var(--color-bg-sub); padding: 4px 12px; border-radius: 4px; display: inline-block;">\${getCenturyRoman(currentCentury)} століття</div>
                                    </li>
                                \`;
                            }
                        }`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
