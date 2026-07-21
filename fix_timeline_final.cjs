const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldSidebarLogic = `                    sidebar.innerHTML = \`
                        <div>
                            <div class="profile-toc-container">
                                <h3 class="profile-toc-title">Століття</h3>
                                <ul class="profile-toc-list">
                                    \${tocLinksHtml}
                                </ul>
                            </div>
                        </div>
                    \`;
                    
                    const isDesktop = window.innerWidth >= 1200;
                    sidebar.style.display = isDesktop && tocCenturies.size > 0 ? 'block' : 'none';
                }
                
                // Attach events to newly generated links`;

const newSidebarLogic = `                    sidebar.innerHTML = \`
                        <div>
                            <div class="profile-toc-container">
                                <h3 class="profile-toc-title">\${(i18n.t("time.century") || "століття").toUpperCase()}</h3>
                                <ul class="profile-toc-list">
                                    \${tocLinksHtml}
                                </ul>
                            </div>
                        </div>
                    \`;
                    
                    const isDesktop = window.innerWidth >= 1200;
                    sidebar.style.display = isDesktop && tocCenturies.size > 0 ? 'block' : 'none';
                    
                    sidebar.querySelectorAll('.js-scroll-to').forEach(link => {
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            const targetId = link.getAttribute('href').substring(1);
                            const targetEl = document.getElementById(targetId);
                            if (targetEl) {
                                targetEl.scrollIntoView({ behavior: 'smooth' });
                            }
                        });
                    });
                }
                
                // Attach events to newly generated links`;

code = code.replace(oldSidebarLogic, newSidebarLogic);

const oldHeader = '<li id="timeline-century-${currentCentury}" style="list-style: none; margin-top: 24px; margin-bottom: 16px; display: flex; align-items: center; width: 100%; padding: 12px 0; scroll-margin-top: 170px;">';
const newHeader = '<li id="timeline-century-${currentCentury}" style="list-style: none; margin-top: 24px; margin-bottom: 16px; display: flex; align-items: center; width: 100%; padding: 12px 0; scroll-margin-top: 160px;">';

code = code.replace(oldHeader, newHeader);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
