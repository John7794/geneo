const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const targetRegex = /this\.containerPlaces\.style\.display = "flex";\s*this\.containerPlaces\.style\.flexDirection = "column";\s*this\.containerPlaces\.style\.gap = "8px";\s*if \(sortedEntries\.length === 0\) \{[\s\S]*?this\.containerPlaces\.innerHTML = sortedEntries\.map\(p => \{[\s\S]*?const placeItems = this\.containerPlaces\.querySelectorAll\('\.analytics-place-item'\);\s*placeItems\.forEach\(item => \{[\s\S]*?\}\);\s*\}\);/m;

const replacement = `
            this.containerPlaces.style.display = "block";
            
            if (sortedEntries.length === 0) {
                this.containerPlaces.innerHTML = \`<li style="list-style: none; color: var(--color-text-muted); padding: 12px; text-align: center; background: var(--color-bg-card); border-radius: 8px;">Немає даних про населені пункти</li>\`;
                return;
            }

            let tocLinksHtml = "";
            let html = "";
            
            sortedEntries.forEach((p, idx) => {
                const total = p[1].total;
                const eventsObj = p[1].events;
                const placeName = placeNameMap[p[0]] || p[0];
                const blockId = \`event-place-\${idx}\`;
                
                tocLinksHtml += \`<li><a href="#\${blockId}" class="profile-toc-link js-scroll-to">\${placeName}</a></li>\`;
                
                html += \`
                <li id="\${blockId}" class="analytics-place-item" style="list-style: none; margin-top: 24px; margin-bottom: 12px; padding-bottom: 4px;">
                    <div class="analytics-place-header" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; border-bottom: 2px solid var(--color-border); padding-bottom: 8px;">
                        <h3 style="margin: 0; font-size: 20px; color: var(--color-text-main);">\${placeName} <span style="font-size: 14px; font-weight: normal; color: var(--color-text-muted); margin-left: 8px;">(\${total} \${getEventWord(total)})</span></h3>
                        <i class="ri-arrow-down-s-line analytics-place-icon analytics-mobile-only" style="transition: transform 0.3s; color: var(--color-text-main); font-size: 24px; transform: rotate(180deg);"></i>
                    </div>
                    <div class="analytics-place-body" style="display: block; padding-top: 8px;">
                        <ul style="list-style: none; padding: 0; margin: 0;">
                            \${(() => {
                                const EVENT_ORDER = ["народження", "хрещення", "шлюб", "смерть", "поховання", "згадки в індексах пращурів", "походження"];
                                const getEventSortIndex = (eventName) => {
                                    const idx = EVENT_ORDER.indexOf(eventName);
                                    return idx !== -1 ? idx : 999;
                                };
                                const sortedEvents = Object.entries(eventsObj).sort((a, b) => getEventSortIndex(a[0]) - getEventSortIndex(b[0]));
                                return sortedEvents.map(e => {
                                    const evtName = e[0];
                                    const evtCount = e[1];
                                    const peopleList = Array.from(p[1].peopleLists?.[evtName] || []);
                                    const peopleHtml = peopleList.length > 0 
                                        ? \`<ul style="list-style: none; padding-left: 0; margin: 0; display: flex; flex-direction: column; gap: 4px;">
                                            \${peopleList.map(personName => \`<li style="display: flex; align-items: center; padding: 6px 12px; background: var(--color-bg-card); border: 1px solid var(--color-border-light); border-radius: 6px;"><div style="font-size: 15px; color: var(--color-text-main);">\${personName}</div></li>\`).join("")}
                                          </ul>\` 
                                        : "";
                                
                                return \`
                                <li style="list-style: none; margin-top: 8px; margin-bottom: 4px; margin-left: 12px;">
                                    <div style="font-size: 14px; font-weight: 600; color: var(--color-text-muted); margin-bottom: 4px; text-transform: capitalize;">\${evtName}</div>
                                    \${peopleHtml}
                                </li>
                                \`;
                                }).join("");
                            })()}
                        </ul>
                    </div>
                </li>
                \`;
            });

            this.containerPlaces.innerHTML = \`
                <div class="events-layout-with-sidebar" style="position: relative; width: 100%;">
                    <aside class="events-sidebar-desktop" style="display: none;">
                        <div>
                            <div class="profile-toc-container">
                                <h3 class="profile-toc-title">Населені пункти</h3>
                                <ul class="profile-toc-list">
                                    \${tocLinksHtml}
                                </ul>
                            </div>
                        </div>
                    </aside>
                    <div class="events-body-blocks">
                        <ul class="analytics-list-none" style="padding: 0; margin: 0;">
                            \${html}
                        </ul>
                    </div>
                </div>
            \`;
            
            const placeItems = this.containerPlaces.querySelectorAll('.analytics-place-item');
            placeItems.forEach(item => {
                const header = item.querySelector('.analytics-place-header');
                const body = item.querySelector('.analytics-place-body');
                const icon = item.querySelector('.analytics-place-icon');
                
                const isDesktop = window.innerWidth >= 1200;
                if (!isDesktop) {
                    body.style.display = 'none';
                    if (icon) icon.style.transform = 'rotate(0deg)';
                }
                
                header.addEventListener('click', () => {
                    const isOpen = body.style.display === 'block';
                    body.style.display = isOpen ? 'none' : 'block';
                    if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
                });
            });`;

if (targetRegex.test(code)) {
    code = code.replace(targetRegex, replacement);
    fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
    console.log('Successfully replaced places rendering logic.');
} else {
    console.log('Regex did not match.');
}
