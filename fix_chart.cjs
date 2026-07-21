const fs = require('fs');

let content = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

// Find renderTimelineChart and replace it
const startIdx = content.indexOf('const renderTimelineChart = () => {');
const endIdx = content.indexOf('const renderTimeline = () => {');

const newRenderChart = `
            const renderTimelineChart = () => {
                if (!chartContainer) return;
                
                const timelineList = document.getElementById("analytics-timeline-list");
                
                const personEvents = {};
                
                allTimelineEvents.forEach(evt => {
                    if (currentFilter !== "all" && evt.type !== currentFilter) return;
                    if (!evt.gregorian || isNaN(evt.gregorian.year)) return;
                    
                    const pid = evt.person.id;
                    if (!personEvents[pid]) {
                        personEvents[pid] = { person: evt.person, birth: null, death: null, marriages: [], events: [] };
                    }
                    
                    if (evt.type === 'birth') personEvents[pid].birth = evt.gregorian.year;
                    else if (evt.type === 'death' || evt.type === 'funeral') {
                        if (!personEvents[pid].death) personEvents[pid].death = evt.gregorian.year;
                    }
                    else if (evt.type === 'marriage') {
                        personEvents[pid].marriages.push(evt.gregorian.year);
                    }
                    personEvents[pid].events.push(evt);
                });
                
                const validPeople = Object.values(personEvents).filter(p => p.birth !== null || p.death !== null);
                
                if (validPeople.length === 0) {
                    chartContainer.innerHTML = "<div style='padding: 16px; text-align: center; color: var(--color-text-muted);'>Немає даних для побудови графіка</div>";
                    return;
                }
                
                let minYear = 9999;
                
                validPeople.forEach(p => {
                    let by = p.birth;
                    let dy = p.death;
                    if (by !== null && dy === null) dy = by + 70;
                    else if (dy !== null && by === null) by = dy - 70;
                    
                    if (by < minYear) minYear = by;
                });
                
                minYear -= 10;
                const maxYear = 2026; // Strictly cut by current year
                
                const ypx = 12;
                const totalWidth = (maxYear - minYear) * ypx;
                
                let axisHtml = '<div style="display: flex; position: sticky; top: 0; z-index: 10; background: var(--color-bg-card); padding-bottom: 8px; border-bottom: 1px solid var(--color-border);">';
                
                let currentDecade = Math.floor(minYear / 10) * 10;
                let d = currentDecade;
                let tocCenturies = new Set();
                
                while (d <= maxYear) {
                    const w = 10 * ypx;
                    const isCentury = d % 100 === 0;
                    if (isCentury) {
                        const cent = Math.ceil((d+1) / 100);
                        tocCenturies.add(cent);
                    }
                    const text = isCentury ? \`<b>\${d}</b>\` : \`\${d}\`;
                    const markerHeight = isCentury ? 8 : 4;
                    const borderLeft = isCentury ? '2px solid var(--color-text-main)' : '1px solid var(--color-border)';
                    
                    axisHtml += \`
                        <div id="chart-decade-\${d}" style="width: \${w}px; flex-shrink: 0; position: relative;">
                            <div style="font-size: 10px; color: var(--color-text-muted); padding-left: 4px; padding-bottom: 12px;">\${text}</div>
                            <div style="position: absolute; bottom: 0; left: 0; width: 1px; height: \${markerHeight}px; border-left: \${borderLeft};"></div>
                        </div>
                    \`;
                    d += 10;
                }
                axisHtml += '</div>';
                
                let rowsHtml = '<div style="position: relative; margin-top: 12px; padding-bottom: 16px;">';
                
                // Modern years first (descending by birth year)
                validPeople.sort((a, b) => {
                    const aY = a.birth !== null ? a.birth : (a.death - 70);
                    const bY = b.birth !== null ? b.birth : (b.death - 70);
                    return bY - aY; 
                });
                
                validPeople.forEach((p, idx) => {
                    let by = p.birth;
                    let dy = p.death;
                    
                    let startY = by !== null ? by : (dy - 70);
                    let endY = dy !== null ? dy : (by + 70);
                    
                    // Clamp to min/max
                    if (startY < minYear) startY = minYear;
                    if (endY > maxYear) endY = maxYear;
                    if (startY > maxYear || endY < minYear) return;
                    
                    let leftPx = (startY - minYear) * ypx;
                    let widthPx = (endY - startY) * ypx;
                    
                    let bgStyle = 'background: rgba(30, 136, 229, 0.2); border: 1px solid rgba(30, 136, 229, 0.5);';
                    let borderRadius = 'border-radius: 4px;';
                    
                    if (by === null) {
                        bgStyle = 'background: linear-gradient(to right, transparent, rgba(30, 136, 229, 0.4)); border: none; border-right: 2px solid rgba(30, 136, 229, 0.8);';
                        borderRadius = 'border-radius: 0 4px 4px 0;';
                    } else if (dy === null) {
                        bgStyle = 'background: linear-gradient(to left, transparent, rgba(30, 136, 229, 0.4)); border: none; border-left: 2px solid rgba(30, 136, 229, 0.8);';
                        borderRadius = 'border-radius: 4px 0 0 4px;';
                    }
                    
                    let markersHtml = '';
                    if (by !== null && by >= minYear && by <= maxYear) {
                        const mLeft = (by - startY) * ypx;
                        markersHtml += \`<div style="position: absolute; left: \${mLeft}px; top: 50%; transform: translate(-50%, -50%); width: 8px; height: 8px; border-radius: 50%; background: var(--color-success); border: 1px solid white;" title="Народження (\${by})"></div>\`;
                    }
                    if (dy !== null && dy >= minYear && dy <= maxYear) {
                        const mLeft = (dy - startY) * ypx;
                        markersHtml += \`<div style="position: absolute; left: \${mLeft}px; top: 50%; transform: translate(-50%, -50%); width: 8px; height: 8px; border-radius: 50%; background: var(--color-danger); border: 1px solid white;" title="Смерть (\${dy})"></div>\`;
                    }
                    p.marriages.forEach(my => {
                        if (my >= minYear && my <= maxYear) {
                            const mLeft = (my - startY) * ypx;
                            markersHtml += \`<div style="position: absolute; left: \${mLeft}px; top: 50%; transform: translate(-50%, -50%); width: 6px; height: 6px; border-radius: 50%; background: var(--color-warning); border: 1px solid white;" title="Шлюб (\${my})"></div>\`;
                        }
                    });
                    
                    rowsHtml += \`
                        <div style="display: flex; align-items: center; height: 28px; position: relative;">
                            <div style="position: absolute; left: 0; right: 0; height: 1px; background: var(--color-border-light); z-index: 1;"></div>
                            
                            <div style="position: absolute; left: \${leftPx}px; width: \${widthPx}px; height: 16px; \${bgStyle} \${borderRadius} z-index: 2; box-sizing: border-box;">
                                \${markersHtml}
                            </div>
                            
                            <div style="position: absolute; left: \${leftPx + widthPx + 8}px; white-space: nowrap; font-size: 11px; z-index: 3; color: var(--color-text-main);">
                                <a href="#" class="analytics-person-link" data-pid="\${p.person.id}" style="color: inherit; text-decoration: none;">\${escapeHtml(p.person.name)}</a>
                            </div>
                        </div>
                    \`;
                });
                
                rowsHtml += '</div>';
                
                let gridHtml = '<div style="position: absolute; top: 0; left: 0; bottom: 0; pointer-events: none;">';
                d = currentDecade;
                while (d <= maxYear) {
                    const isCentury = d % 100 === 0;
                    const borderLeft = isCentury ? '2px dashed var(--color-border-light)' : '1px dashed var(--color-border-light)';
                    const opacity = isCentury ? 1 : 0.5;
                    const lpx = (d - minYear) * ypx;
                    gridHtml += \`<div style="position: absolute; left: \${lpx}px; top: 0; bottom: 0; width: 1px; border-left: \${borderLeft}; opacity: \${opacity};"></div>\`;
                    d += 10;
                }
                gridHtml += '</div>';
                
                chartContainer.innerHTML = \`
                    <div style="min-width: \${totalWidth + 300}px; position: relative;" id="analytics-timeline-chart-inner">
                        \${axisHtml}
                        <div style="position: relative;">
                            \${gridHtml}
                            \${rowsHtml}
                        </div>
                    </div>
                \`;
                
                chartContainer.querySelectorAll('.analytics-person-link').forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        const pid = e.target.getAttribute('data-pid') || e.currentTarget.getAttribute('data-pid');
                        if (pid && window.app && window.app.navigateToId) {
                            window.app.navigateToId(pid, false, 'profile');
                        }
                    });
                });
                
                const getCenturyRoman = (c) => {
                    const romanNumerals = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI", "XXII", "XXIII", "XXIV", "XXV"];
                    return romanNumerals[c] || c;
                };
                
                let tocLinksHtml = Array.from(tocCenturies).sort((a, b) => b - a).map(c => \`<li><a href="#" data-cent="\${c}" class="profile-toc-link js-scroll-chart">\${getCenturyRoman(c)} століття</a></li>\`).join('');
                
                let sidebar = timelineList && timelineList.closest('.events-layout-with-sidebar') ? timelineList.closest('.events-layout-with-sidebar').querySelector('.events-sidebar-desktop') : null;
                if (!sidebar && timelineList) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'events-layout-with-sidebar';
                    wrapper.style.cssText = 'position: relative; width: 100%;';
                    sidebar = document.createElement('aside');
                    sidebar.className = 'events-sidebar-desktop';
                    const bodyBlocks = document.createElement('div');
                    bodyBlocks.className = 'events-body-blocks';
                    timelineList.parentNode.insertBefore(wrapper, timelineList);
                    wrapper.appendChild(sidebar);
                    wrapper.appendChild(bodyBlocks);
                    bodyBlocks.appendChild(timelineList);
                    if (chartContainer) bodyBlocks.appendChild(chartContainer);
                }
                
                if (sidebar) {
                    sidebar.style.display = 'block';
                    
                    const sliderId = "timeline-year-slider";
                    const valueId = "timeline-year-value";
                    const resultsId = "timeline-alive-results";
                    
                    sidebar.innerHTML = \`
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
                                        <span id="\${valueId}" style="font-weight: 600; font-size: 14px; color: var(--color-primary);">\${maxYear}</span>
                                    </div>
                                    <input type="range" id="\${sliderId}" min="\${minYear}" max="\${maxYear}" value="\${maxYear}" style="width: 100%;">
                                    <div id="\${resultsId}" style="max-height: 300px; overflow-y: auto; margin-top: 8px; display: flex; flex-direction: column; gap: 4px;">
                                    </div>
                                </div>
                            </div>
                        </div>
                    \`;
                    
                    sidebar.querySelectorAll('.js-scroll-chart').forEach(link => {
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            const c = parseInt(e.currentTarget.getAttribute('data-cent'), 10);
                            const year = (c - 1) * 100;
                            const dec = Math.floor(year / 10) * 10;
                            const el = document.getElementById(\`chart-decade-\${dec}\`);
                            if (el && chartContainer) {
                                chartContainer.scrollTo({
                                    left: el.offsetLeft - 16,
                                    behavior: 'smooth'
                                });
                            }
                        });
                    });
                    
                    const slider = document.getElementById(sliderId);
                    const valDisplay = document.getElementById(valueId);
                    const resultsBox = document.getElementById(resultsId);
                    
                    const updateAliveList = () => {
                        if (!slider || !valDisplay || !resultsBox) return;
                        const y = parseInt(slider.value, 10);
                        valDisplay.textContent = y;
                        
                        const alive = validPeople.filter(p => {
                            const by = p.birth;
                            const dy = p.death;
                            
                            let startY = by !== null ? by : (dy - 70);
                            let endY = dy !== null ? dy : (by + 70);
                            
                            return y >= startY && y <= endY;
                        });
                        
                        if (alive.length === 0) {
                            resultsBox.innerHTML = '<div style="font-size: 11px; color: var(--color-text-muted);">Немає даних</div>';
                        } else {
                            // Sort alphabetical
                            alive.sort((a,b) => a.person.name.localeCompare(b.person.name));
                            resultsBox.innerHTML = alive.map(p => \`
                                <div style="font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    <a href="#" class="analytics-person-link" data-pid="\${p.person.id}" style="color: var(--color-text-main); text-decoration: none;">\${escapeHtml(p.person.name)}</a>
                                </div>
                            \`).join('');
                            
                            resultsBox.querySelectorAll('.analytics-person-link').forEach(link => {
                                link.addEventListener('click', (e) => {
                                    e.preventDefault();
                                    const pid = e.target.getAttribute('data-pid') || e.currentTarget.getAttribute('data-pid');
                                    if (pid && window.app && window.app.navigateToId) {
                                        window.app.navigateToId(pid, false, 'profile');
                                    }
                                });
                            });
                        }
                    };
                    
                    if (slider) {
                        slider.addEventListener('input', updateAliveList);
                        updateAliveList(); // Initial call
                    }
                }
            };
`;

content = content.substring(0, startIdx) + newRenderChart + content.substring(endIdx);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', content);
