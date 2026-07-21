const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

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
                            <div class="profile-toc-container">
                                <h3 class="profile-toc-title">Століття</h3>
                                <ul class="profile-toc-list">
                                    \${tocLinksHtml}
                                </ul>
                            </div>
                        </div>
                    \`;`;

code = code.replace(oldSidebarLogic, newSidebarLogic);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
