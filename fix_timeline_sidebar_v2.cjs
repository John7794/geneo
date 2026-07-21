const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldTocLinks = `                    let tocLinksHtml = Array.from(tocCenturies).map(c => \`
                        <li>
                            <a href="#timeline-century-\${c}" class="profile-toc-link js-scroll-to">\${getCenturyRoman(c)} \${i18n.t("time.century") || "століття"}</a>
                        </li>
                    \`).join('');`;

const newTocLinks = `                    let tocLinksHtml = Array.from(tocCenturies).map(c => \`
                        <li>
                            <a href="#timeline-century-\${c}" class="profile-toc-link js-scroll-to" style="display: flex; gap: 8px;">
                                <span style="display: inline-block; width: 36px; text-align: right;">\${getCenturyRoman(c)}</span>
                                <span>\${i18n.t("time.century") || "століття"}</span>
                            </a>
                        </li>
                    \`).join('');`;

code = code.replace(oldTocLinks, newTocLinks);

const oldSidebarLogic = `                    sidebar.innerHTML = \`
                        <div>
                            <div class="profile-toc-container">
                                <h3 class="profile-toc-title">\${i18n.t("time.century") || "століття"}</h3>
                                <ul class="profile-toc-list">
                                    \${tocLinksHtml}
                                </ul>
                            </div>
                        </div>
                    \`;`;

const newSidebarLogic = `                    sidebar.innerHTML = \`
                        <div>
                            <div class="profile-toc-container" style="position: sticky; top: 16px; align-self: start; background: var(--color-bg-card); border-radius: 8px; border: 1px solid var(--color-border); padding: 12px; font-size: 14px; min-width: 150px;">
                                <h3 class="profile-toc-title" style="font-weight: 600; margin-bottom: 8px; color: var(--color-text-main); font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">\${i18n.t("time.century") || "століття"}</h3>
                                <ul class="profile-toc-list" style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px;">
                                    \${tocLinksHtml}
                                </ul>
                            </div>
                        </div>
                    \`;`;

code = code.replace(oldSidebarLogic, newSidebarLogic);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
