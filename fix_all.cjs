const fs = require('fs');
let jsCode = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const startMarker = "const peopleHtml = peopleList.length > 0";
const endMarker = "        // Events Calendar";

const startIndex = jsCode.indexOf(startMarker);
const endIndex = jsCode.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    // We are going to replace everything from startIndex to endIndex with the correct reconstruction
    
    const correctCode = `const peopleHtml = peopleList.length > 0 
                                        ? \`<ul style="margin: 8px 0 0 12px; padding: 0; list-style: disc; font-size: 13px; color: var(--color-text-muted);">
                                            \${peopleList.map(personName => \`<li style="margin-bottom: 4px;">\${personName}</li>\`).join("")}
                                          </ul>\` 
                                        : "";
                                    return \`
                                        <li style="list-style: none; margin-top: 8px; margin-bottom: 4px; margin-left: 12px;">
                                            <div style="font-size: 14px; font-weight: 600; color: var(--color-text-muted); margin-bottom: 4px; text-transform: capitalize;">\${evtName} <span style="font-weight: normal;">(\${evtCount})</span></div>
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
            
            // Add accordion behavior for places
            const placeItems = this.containerPlaces.querySelectorAll('.analytics-place-item');
            placeItems.forEach(item => {
                const header = item.querySelector('.analytics-place-header');
                const body = item.querySelector('.analytics-place-body');
                const icon = item.querySelector('.analytics-place-icon');
                
                const isDesktop = window.innerWidth >= 1200;
                if (!isDesktop) {
                    body.style.display = 'none';
                    if (icon) icon.style.transform = 'rotate(0deg)';
                } else {
                    header.style.cursor = 'default';
                }

                header.addEventListener('click', () => {
                    if (window.innerWidth >= 1200) return;
                    const isOpen = body.style.display === 'block';
                    body.style.display = isOpen ? 'none' : 'block';
                    if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
                });
            });
            
            // Sidebar display on desktop
            const sidebar = this.containerPlaces.querySelector('.events-sidebar-desktop');
            if (sidebar && window.innerWidth >= 1200) {
                sidebar.style.display = 'block';
            }
            
            // Attach smooth scroll for toc links
            this.containerPlaces.querySelectorAll('.js-scroll-to').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetId = link.getAttribute('href').substring(1);
                    const targetEl = document.getElementById(targetId);
                    if (targetEl) {
                        const body = targetEl.querySelector('.analytics-place-body');
                        const icon = targetEl.querySelector('.analytics-place-icon');
                        if (body && body.style.display === 'none') {
                            body.style.display = 'block';
                            if (icon) icon.style.transform = 'rotate(180deg)';
                        }
                        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            });
            
            // Sort container
            const sortContainerPlaces = document.createElement("div");
            sortContainerPlaces.className = "analytics-sort-controls";
            sortContainerPlaces.style.marginBottom = "16px";
            sortContainerPlaces.innerHTML = \`
                    <div class="analytics-sort-desktop" style="display: flex; gap: 8px;">
                        <span style="font-size: 14px; color: var(--color-text-muted); margin-right: 8px; display: flex; align-items: center;">Сортувати за:</span>
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="frequency">За популярністю</button>
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="appearance">За згадкою</button>
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="alphabet_az">А - Я</button>
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="alphabet_za">Я - А</button>
                    </div>
                    <div class="analytics-sort-mobile" style="display: none; ">
                        <button class="btn btn-sm btn-outline w-full" id="btn-mobile-sort-places" onclick="document.getElementById('mobile-sort-popup-places').classList.add('show')">
                            <i class="ri-sort-desc"></i> Сортувати населені пункти
                        </button>
                    </div>
                    <div id="mobile-sort-popup-places" class="popup-overlay" style="z-index: 9999;" onclick="if(event.target===this) this.classList.remove('show')">
                        <div class="popup-content" style="max-width: 300px; width: 90%; margin: auto; padding: 24px; border-radius: 12px; background: var(--color-bg-card); display: flex; flex-direction: column; gap: 12px;">
                            <h3 style="margin-top: 0; margin-bottom: 8px; font-size: 18px;">Сортувати за</h3>
                            <button class="btn btn-outline btn-sort-places" data-sort="frequency" onclick="document.getElementById('mobile-sort-popup-places').classList.remove('show')">За популярністю</button>
                            <button class="btn btn-outline btn-sort-places" data-sort="appearance" onclick="document.getElementById('mobile-sort-popup-places').classList.remove('show')">За згадкою</button>
                            <button class="btn btn-outline btn-sort-places" data-sort="alphabet_az" onclick="document.getElementById('mobile-sort-popup-places').classList.remove('show')">А - Я</button>
                            <button class="btn btn-outline btn-sort-places" data-sort="alphabet_za" onclick="document.getElementById('mobile-sort-popup-places').classList.remove('show')">Я - А</button>
                            <button class="btn mt-2" style="background: var(--color-bg-hover); color: var(--color-text-main); border: 1px solid var(--color-border);" onclick="document.getElementById('mobile-sort-popup-places').classList.remove('show')">Закрити</button>
                        </div>
                    </div>
            \`;
            this.containerPlaces.insertBefore(sortContainerPlaces, this.containerPlaces.firstChild);
            
            const activeSort = window.app?.managers?.analytics?.currentPlaceSort || 'alphabet_az'; // default to something
            this.containerPlaces.querySelectorAll('.btn-sort-places').forEach(btn => {
                if (btn.dataset.sort === activeSort) {
                    btn.classList.add('active');
                    btn.style.background = 'var(--color-bg-hover)';
                }
            });

            // Add sort listeners
            const updateSortButtons = (activeSortMode) => {
                this.containerPlaces.querySelectorAll('.btn-sort-places').forEach(btn => {
                    if (btn.dataset.sort === activeSortMode) {
                        btn.classList.add('active');
                        btn.style.background = 'var(--color-bg-hover)';
                    } else {
                        btn.classList.remove('active');
                        btn.style.background = '';
                    }
                });
            };
            
            this.containerPlaces.querySelectorAll('.btn-sort-places').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const sortMode = e.currentTarget.dataset.sort;
                    updateSortButtons(sortMode);
                    this.renderPlaces(sortMode);
                });
            });
        }
        
        // Causes of death
        const containerDeaths = document.getElementById("analytics-deaths");
        if (containerDeaths && this.engine.db.death) {
            const deathsMap = {};
            this.engine.db.death.forEach(d => {
                const pid = d[COLUMNS.death?.personId || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;

                let cause = d[COLUMNS.death?.cause || "d_cause"];
                if (cause && String(cause).trim() !== "") {
                    cause = String(cause).trim();
                    if (!deathsMap[cause]) {
                        deathsMap[cause] = { count: 0, people: [] };
                    }
                    deathsMap[cause].count++;
                    
                    let personName = "Невідомо";
                    const p = this.engine?.getPerson(pid);
                    if (p) {
                        personName = p.name || "";
                        if (p.source === "basic" && p.raw) {
                            const s = String(p.raw[COLUMNS.basic?.surname || "surname"] || "").trim();
                            const n = String(p.raw[COLUMNS.basic?.name || "name"] || "").trim();
                            const pat = String(p.raw[COLUMNS.basic?.patronymic || "patronymic"] || "").trim();
                            personName = [s, n, pat].filter(Boolean).join(" ");
                        }
                    }
                    if (!personName.trim()) personName = "Невідомо";
                    deathsMap[cause].people.push({ pid, name: personName });
                }
            });
            
            const topDeaths = Object.entries(deathsMap).sort((a, b) => b[1].count - a[1].count);
            containerDeaths.style.display = "flex";
            containerDeaths.style.flexDirection = "column";
            containerDeaths.style.gap = "8px";
            if (topDeaths.length === 0) {
                containerDeaths.innerHTML = \`<li style="list-style: none; color: var(--color-text-muted); padding: 12px; text-align: center; background: var(--color-bg-card); border-radius: 8px;">Немає даних про причини смерті</li>\`;
            } else {
                containerDeaths.innerHTML = topDeaths.map(d => {
                    const cause = d[0];
                    const count = d[1].count;
                    const peopleList = d[1].people;
                    const peopleHtml2 = peopleList.length > 0 
                        ? \`<ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;">
                            \${peopleList.map(person => \`
                                <li style="padding: 12px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 8px; list-style: none;">
                                    <div style="font-size: 15px; color: var(--color-text-main); line-height: 1.4;">
                                        <a href="?id=\${encodeURIComponent(person.pid)}&view=profile" class="analytics-person-link js-stop-prop" data-pid="\${person.pid}" style="color: var(--color-primary); text-decoration: none;">\${escapeHtml(person.name)}</a>
                                    </div>
                                </li>
                            \`).join("")}
                          </ul>\` 
                        : "";

                    return \`
                    <li class="analytics-death-item" style="list-style: none; margin-top: \${d[0] === topDeaths[0][0] ? '0' : '24px'}; margin-bottom: 12px; padding-bottom: 4px;">
                        <div class="analytics-death-header" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; border-bottom: 2px solid var(--color-border); padding-bottom: 8px;">
                            <h3 style="margin: 0; font-size: 20px; color: var(--color-text-main);">\${cause}</h3>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 16px; font-weight: 600; color: var(--color-text-muted);">\${count}</span>
                                <i class="ri-arrow-down-s-line analytics-death-icon analytics-mobile-only" style="transition: transform 0.3s; color: var(--color-text-main); font-size: 24px; transform: rotate(180deg);"></i>
                            </div>
                        </div>
                        <div class="analytics-death-body" style="display: block; padding-top: 16px;">
                            \${peopleHtml2}
                        </div>
                    </li>
                \`}).join("");

                // Add accordion behavior
                const deathItems = containerDeaths.querySelectorAll('.analytics-death-item');
                deathItems.forEach(item => {
                    const header = item.querySelector('.analytics-death-header');
                    const body = item.querySelector('.analytics-death-body');
                    const icon = item.querySelector('.analytics-death-icon');
                    
                    const isDesktop = window.innerWidth >= 1200;
                    if (!isDesktop) {
                        body.style.display = 'none';
                        if (icon) icon.style.transform = 'rotate(0deg)';
                    } else {
                        header.style.cursor = 'default';
                    }

                    header.addEventListener('click', () => {
                        if (window.innerWidth >= 1200) return;
                        const isOpen = body.style.display === 'block';
                        body.style.display = isOpen ? 'none' : 'block';
                        if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
                    });
                });
            }
        }
\n`;
    
    jsCode = jsCode.substring(0, startIndex) + correctCode + jsCode.substring(endIndex);
    fs.writeFileSync('scripts/components/interaction/analyticsManager.js', jsCode);
    console.log("Success");
} else {
    console.log("Markers not found");
}

