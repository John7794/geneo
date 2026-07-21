const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldTocLinks = `                    let tocLinksHtml = Array.from(tocCenturies).map(c => \`
                        <li>
                            <a href="#timeline-century-\${c}" class="profile-toc-link js-scroll-to" style="display: flex; gap: 8px;">
                                <span style="display: inline-block; width: 36px; text-align: right;">\${getCenturyRoman(c)}</span>
                                <span>\${i18n.t("time.century") || "століття"}</span>
                            </a>
                        </li>
                    \`).join('');`;

const newTocLinks = `                    let tocLinksHtml = Array.from(tocCenturies).map(c => \`
                        <li>
                            <a href="#timeline-century-\${c}" class="profile-toc-link js-scroll-to" style="display: flex; gap: 8px; align-items: center;">
                                <span style="display: inline-block; width: 40px; text-align: right; font-weight: 700; color: var(--color-text-main);">\${getCenturyRoman(c)}</span>
                                <span style="color: var(--color-text-muted);">\${i18n.t("time.century") || "століття"}</span>
                            </a>
                        </li>
                    \`).join('');`;

code = code.replace(oldTocLinks, newTocLinks);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
