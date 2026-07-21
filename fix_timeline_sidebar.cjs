const fs = require('fs');

let content = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldSidebarHtml = `                    sidebar.innerHTML = \`
                        <div>
                            <div class="profile-toc-container" style="margin-bottom: 24px;">
                                <h3 class="profile-toc-title">СТОЛІТТЯ</h3>
                                <ul class="profile-toc-list">
                                    \${tocLinksHtml}
                                </ul>
                            </div>
                            
                            <div class="profile-toc-container">
                                <h3 class="profile-toc-title">ХТО ЖИВ В РОЦІ...</h3>
                                <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 8px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <span id="\${valueId}" style="font-weight: 600; font-size: 20px; color: var(--color-primary);">\${maxYear}</span>
                                    </div>
                                    <div id="\${resultsId}" style="max-height: 400px; overflow-y: auto; margin-top: 8px; display: flex; flex-direction: column; gap: 4px;">
                                    </div>
                                </div>
                            </div>
                        </div>
                    \`;`;

const newSidebarHtml = `                    sidebar.innerHTML = \`
                        <div>
                            <div class="profile-toc-container">
                                <h3 class="profile-toc-title">ХТО ЖИВ В РОЦІ...</h3>
                                <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 8px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <span id="\${valueId}" style="font-weight: 600; font-size: 20px; color: var(--color-primary);">\${maxYear}</span>
                                    </div>
                                    <div id="\${resultsId}" style="max-height: 400px; overflow-y: auto; margin-top: 8px; display: flex; flex-direction: column; gap: 4px;">
                                    </div>
                                </div>
                            </div>
                        </div>
                    \`;`;

if (content.includes(oldSidebarHtml)) {
    content = content.replace(oldSidebarHtml, newSidebarHtml);
    fs.writeFileSync('scripts/components/interaction/analyticsManager.js', content);
    console.log('Replaced successfully.');
} else {
    console.log('Could not find the target HTML to replace.');
}
