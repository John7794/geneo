const fs = require('fs');

let content = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const patchCode = `
            let timelineViewMode = "list";
            
            const btnViewList = document.getElementById("timeline-view-list-btn");
            const btnViewChart = document.getElementById("timeline-view-chart-btn");
            const chartContainer = document.getElementById("analytics-timeline-chart");
            
            if (btnViewList && btnViewChart) {
                btnViewList.addEventListener("click", () => {
                    timelineViewMode = "list";
                    btnViewList.style.background = 'var(--color-primary)';
                    btnViewList.style.color = 'white';
                    btnViewChart.style.background = 'transparent';
                    btnViewChart.style.color = 'var(--color-text-main)';
                    renderTimeline();
                });
                btnViewChart.addEventListener("click", () => {
                    timelineViewMode = "chart";
                    btnViewChart.style.background = 'var(--color-primary)';
                    btnViewChart.style.color = 'white';
                    btnViewList.style.background = 'transparent';
                    btnViewList.style.color = 'var(--color-text-main)';
                    renderTimeline();
                });
            }
            
            const renderTimelineChart = () => {
                if (!chartContainer) return;
                
                // Group events by person
                const personEvents = {};
                
                allTimelineEvents.forEach(evt => {
                    if (currentFilter !== "all" && evt.type !== currentFilter) return;
                    
                    if (!evt.gregorian || isNaN(evt.gregorian.year)) return;
                    
                    const pid = evt.person.id;
                    if (!personEvents[pid]) {
                        personEvents[pid] = {
                            person: evt.person,
                            birth: null,
                            death: null,
                            marriages: [],
                            events: [] // other events
                        };
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
                let maxYear = -9999;
                
                validPeople.forEach(p => {
                    let by = p.birth;
                    let dy = p.death;
                    
                    if (by !== null && dy === null) {
                        dy = by + 70; // assume 70 years approx
                    } else if (dy !== null && by === null) {
                        by = dy - 70;
                    }
                    
                    if (by < minYear) minYear = by;
                    if (dy > maxYear) maxYear = dy;
                });
                
                // Expand borders a bit
                minYear -= 10;
                maxYear += 10;
                
                // Year width in pixels
                const ypx = 12;
                const totalWidth = (maxYear - minYear) * ypx;
                
                // Build Axis
                let axisHtml = '<div style="display: flex; position: sticky; top: 0; z-index: 10; background: var(--color-bg-card); padding-bottom: 8px; border-bottom: 1px solid var(--color-border);">';
                
                let currentDecade = Math.floor(minYear / 10) * 10;
                
                // Filler for the start if not exactly aligned
                const startOffset = minYear - currentDecade;
                if (startOffset > 0) {
                   // axisHtml += \`<div style="width: \${startOffset * ypx}px"></div>\`;
                }
                
                let d = currentDecade;
                while (d <= maxYear) {
                    const w = 10 * ypx;
                    const isCentury = d % 100 === 0;
                    const text = isCentury ? \`<b>\${d}</b>\` : \`\${d}\`;
                    const markerHeight = isCentury ? 8 : 4;
                    const borderLeft = isCentury ? '2px solid var(--color-text-main)' : '1px solid var(--color-border)';
                    
                    axisHtml += \`
                        <div style="width: \${w}px; flex-shrink: 0; position: relative;">
                            <div style="font-size: 10px; color: var(--color-text-muted); padding-left: 4px; padding-bottom: 12px;">\${text}</div>
                            <div style="position: absolute; bottom: 0; left: 0; width: 1px; height: \${markerHeight}px; border-left: \${borderLeft};"></div>
                        </div>
                    \`;
                    d += 10;
                }
                axisHtml += '</div>';
                
                // Build Rows
                let rowsHtml = '<div style="position: relative; margin-top: 12px; padding-bottom: 16px;">';
                
                // Sort by birth year (or death if no birth)
                validPeople.sort((a, b) => {
                    const aY = a.birth !== null ? a.birth : (a.death - 70);
                    const bY = b.birth !== null ? b.birth : (b.death - 70);
                    return aY - bY;
                });
                
                validPeople.forEach((p, idx) => {
                    const by = p.birth;
                    const dy = p.death;
                    
                    let startY = by !== null ? by : (dy - 70);
                    let endY = dy !== null ? dy : (by + 70);
                    
                    let leftPx = (startY - minYear) * ypx;
                    let widthPx = (endY - startY) * ypx;
                    
                    // Gradient styles if approx
                    let bgStyle = 'background: rgba(30, 136, 229, 0.2); border: 1px solid rgba(30, 136, 229, 0.5);';
                    let borderRadius = 'border-radius: 4px;';
                    
                    if (by === null) {
                        bgStyle = 'background: linear-gradient(to right, transparent, rgba(30, 136, 229, 0.4)); border: none; border-right: 2px solid rgba(30, 136, 229, 0.8);';
                        borderRadius = 'border-radius: 0 4px 4px 0;';
                    } else if (dy === null) {
                        bgStyle = 'background: linear-gradient(to left, transparent, rgba(30, 136, 229, 0.4)); border: none; border-left: 2px solid rgba(30, 136, 229, 0.8);';
                        borderRadius = 'border-radius: 4px 0 0 4px;';
                    }
                    
                    // Markers
                    let markersHtml = '';
                    if (by !== null) {
                        const mLeft = (by - startY) * ypx;
                        markersHtml += \`<div style="position: absolute; left: \${mLeft}px; top: 50%; transform: translate(-50%, -50%); width: 8px; height: 8px; border-radius: 50%; background: var(--color-success); border: 1px solid white;" title="Народження (\${by})"></div>\`;
                    }
                    if (dy !== null) {
                        const mLeft = (dy - startY) * ypx;
                        markersHtml += \`<div style="position: absolute; left: \${mLeft}px; top: 50%; transform: translate(-50%, -50%); width: 8px; height: 8px; border-radius: 50%; background: var(--color-danger); border: 1px solid white;" title="Смерть (\${dy})"></div>\`;
                    }
                    p.marriages.forEach(my => {
                        const mLeft = (my - startY) * ypx;
                        markersHtml += \`<div style="position: absolute; left: \${mLeft}px; top: 50%; transform: translate(-50%, -50%); width: 6px; height: 6px; border-radius: 50%; background: var(--color-warning); border: 1px solid white;" title="Шлюб (\${my})"></div>\`;
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
                
                // Decade grid lines
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
                    <div style="min-width: \${totalWidth + 300}px; position: relative;">
                        \${axisHtml}
                        <div style="position: relative;">
                            \${gridHtml}
                            \${rowsHtml}
                        </div>
                    </div>
                \`;
                
                // Re-bind links
                chartContainer.querySelectorAll('.analytics-person-link').forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        const pid = e.target.getAttribute('data-pid') || e.currentTarget.getAttribute('data-pid');
                        if (pid && window.app && window.app.navigateToId) {
                            window.app.navigateToId(pid, false, 'profile');
                        }
                    });
                });
            };
`;

content = content.replace('let currentFilter = "all";', 'let currentFilter = "all";\n' + patchCode);
content = content.replace('const renderTimeline = () => {', `const renderTimeline = () => {
                if (timelineViewMode === "chart") {
                    const timelineList = document.getElementById("analytics-timeline-list");
                    if (timelineList) timelineList.style.display = "none";
                    if (chartContainer) chartContainer.style.display = "block";
                    renderTimelineChart();
                    
                    const sidebar = document.querySelector('.events-sidebar-desktop');
                    if (sidebar) sidebar.style.display = 'none';
                    return;
                }
                
                const timelineList = document.getElementById("analytics-timeline-list");
                if (timelineList) timelineList.style.display = "flex";
                if (chartContainer) chartContainer.style.display = "none";
`);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', content);
