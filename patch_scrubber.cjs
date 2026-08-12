const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Add mode toggle in index.html
const toggleHtml = `<div id="timeline-scrubber-mode-toggle" style="display: none; align-items: center; background: var(--color-bg-card); padding: 4px; border-radius: 8px; border: 1px solid var(--color-border);">
    <button id="scrubber-mode-year-btn" class="btn btn-sm" style="background: var(--color-primary); color: white; border: none; height: 28px; padding: 0 8px; font-size: 12px; border-radius: 6px;">Рік</button>
    <button id="scrubber-mode-period-btn" class="btn btn-sm" style="background: transparent; color: var(--color-text-main); border: none; height: 28px; padding: 0 8px; font-size: 12px; border-radius: 6px;">Період</button>
</div>`;

html = html.replace('<div id="timeline-chart-period-filter"', toggleHtml + '\n                                    <div id="timeline-chart-period-filter"');
fs.writeFileSync('index.html', html, 'utf8');

let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

// 2. Add state for scrubber mode and period values
js = js.replace('let chartPeriodMax = null;', 'let chartPeriodMax = null;\n            let scrubberMode = "year";\n            let scrubberStartYear = null;\n            let scrubberEndYear = null;');

// 3. Update visibility in updateButtonStyles
js = js.replace(
`                        if (periodFilterEl) periodFilterEl.style.display = 'none';`,
`                        if (periodFilterEl) periodFilterEl.style.display = 'none';
                        const scrubberToggle = document.getElementById("timeline-scrubber-mode-toggle");
                        if (scrubberToggle) scrubberToggle.style.display = 'none';`
);

js = js.replace(
`                        if (periodFilterEl) periodFilterEl.style.display = 'inline-flex';`,
`                        if (periodFilterEl) periodFilterEl.style.display = 'inline-flex';
                        const scrubberToggle = document.getElementById("timeline-scrubber-mode-toggle");
                        if (scrubberToggle) scrubberToggle.style.display = 'inline-flex';`
);

// 4. Update the axisHtml creation to generate scrubber UI based on mode
// Replace the scrubberHandleHtml and scrubberLineHtml block
const oldScrubberCode = `        const scrubberHandleHtml = \`
        <div id="timeline-scrubber-handle" style="position: absolute; top: 0; left: \${yearToPx(maxYear)}px; margin-left: -14px; width: 30px; height: 30px; background: var(--color-primary); border-radius: 50%; color: white; font-size: 10px; font-weight: bold; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); user-select: none; cursor: ew-resize;">
            \${maxYear}
        </div>
    \`;
    const scrubberLineHtml = \`
        <div id="timeline-scrubber" style="position: absolute; top: 0; bottom: 0; left: \${yearToPx(maxYear)}px; width: 2px; background: var(--color-primary); z-index: 50; cursor: ew-resize; pointer-events: none;">
        </div>
    \`;
    
    axisHtml += scrubberHandleHtml + "</div>";`;

const newScrubberCode = `
    let scrubberUIHtml = "";
    if (scrubberStartYear === null) scrubberStartYear = maxYear;
    if (scrubberEndYear === null) scrubberEndYear = maxYear;

    if (scrubberMode === "year") {
        scrubberUIHtml = \`
            <div id="timeline-scrubber-handle" data-type="single" style="position: absolute; top: 0; left: \${yearToPx(scrubberStartYear)}px; margin-left: -14px; width: 30px; height: 30px; background: var(--color-primary); border-radius: 50%; color: white; font-size: 10px; font-weight: bold; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); user-select: none; cursor: ew-resize; z-index: 52;">
                \${Math.round(scrubberStartYear)}
            </div>
        \`;
    } else {
        const p1 = Math.min(yearToPx(scrubberStartYear), yearToPx(scrubberEndYear));
        const p2 = Math.max(yearToPx(scrubberStartYear), yearToPx(scrubberEndYear));
        const w = p2 - p1;
        
        scrubberUIHtml = \`
            <div id="timeline-scrubber-bg" style="position: absolute; top: 30px; bottom: -9999px; left: \${p1}px; width: \${w}px; background: rgba(30, 136, 229, 0.1); z-index: 10; pointer-events: none; border-left: 1px dashed var(--color-primary); border-right: 1px dashed var(--color-primary);"></div>
            
            <div id="timeline-scrubber-handle-start" data-type="start" style="position: absolute; top: 0; left: \${yearToPx(scrubberStartYear)}px; margin-left: -14px; width: 30px; height: 30px; background: var(--color-primary); border-radius: 50%; color: white; font-size: 10px; font-weight: bold; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); user-select: none; cursor: ew-resize; z-index: 52;">
                \${Math.round(scrubberStartYear)}
            </div>
            
            <div id="timeline-scrubber-handle-end" data-type="end" style="position: absolute; top: 0; left: \${yearToPx(scrubberEndYear)}px; margin-left: -14px; width: 30px; height: 30px; background: var(--color-primary); border-radius: 50%; color: white; font-size: 10px; font-weight: bold; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); user-select: none; cursor: ew-resize; z-index: 52;">
                \${Math.round(scrubberEndYear)}
            </div>
            
            <div id="timeline-scrubber-drag-area" style="position: absolute; top: 0; left: \${p1}px; width: \${w}px; height: 30px; background: rgba(30, 136, 229, 0.2); cursor: move; z-index: 51;"></div>
        \`;
    }
    axisHtml += scrubberUIHtml + "</div>";
    
    let scrubberLineHtml = "";
    if (scrubberMode === "year") {
        scrubberLineHtml = \`
            <div id="timeline-scrubber" style="position: absolute; top: 0; bottom: 0; left: \${yearToPx(scrubberStartYear)}px; width: 2px; background: var(--color-primary); z-index: 50; pointer-events: none;">
            </div>
        \`;
    }
`;

js = js.replace(oldScrubberCode, newScrubberCode);

// 5. Update the updateAliveList to handle both year and period
const oldUpdateAliveCode = `                    const updateAliveList = (y) => {
                        if (!valDisplay || !resultsBox) return;
                        valDisplay.textContent = Math.round(y);
                        
                        const alive = validPeople.filter(p => {
                            let by = p.birth;
                            let dy = p.death;
                            
                            let isAlive = false;
                            if (dy === null && by !== null && (maxYear - by) <= 120) {
                                isAlive = true;
                            }
                            
                            let startY = by !== null ? by : (dy - 70);
                            let endY = dy !== null ? dy : (by + 70);
                            if (isAlive) endY = maxYear;
                            
                            return y >= startY && y <= endY;
                        });`;

const newUpdateAliveCode = `                    const updateAliveList = (y1, y2) => {
                        if (!valDisplay || !resultsBox) return;
                        if (y2 === undefined || y1 === y2) {
                            valDisplay.textContent = Math.round(y1);
                        } else {
                            valDisplay.textContent = \`\${Math.min(Math.round(y1), Math.round(y2))} - \${Math.max(Math.round(y1), Math.round(y2))}\`;
                        }
                        
                        const sY = y2 === undefined ? y1 : Math.min(y1, y2);
                        const eY = y2 === undefined ? y1 : Math.max(y1, y2);
                        
                        const alive = validPeople.filter(p => {
                            let by = p.birth;
                            let dy = p.death;
                            
                            let isAlive = false;
                            if (dy === null && by !== null && (maxYear - by) <= 120) {
                                isAlive = true;
                            }
                            
                            let startY = by !== null ? by : (dy - 70);
                            let endY = dy !== null ? dy : (by + 70);
                            if (isAlive) endY = maxYear;
                            
                            return !(endY < sY || startY > eY); // overlaps
                        });`;

js = js.replace(oldUpdateAliveCode, newUpdateAliveCode);

// updateAliveList(maxYear); => updateAliveList(scrubberStartYear, scrubberMode === 'period' ? scrubberEndYear : undefined);
js = js.replace('updateAliveList(maxYear); // Initial call', 'updateAliveList(scrubberStartYear, scrubberMode === "period" ? scrubberEndYear : undefined); // Initial call');


// 6. Update scrubber dragging logic
const oldDragLogic = `                    // Scrubber Drag Logic
                    const scrubber = document.getElementById('timeline-scrubber');
                    const scrubberHandle = document.getElementById('timeline-scrubber-handle');
                    const innerChart = document.getElementById('analytics-timeline-chart-inner');
                    
                    let isDraggingScrubber = false;
                    let isDraggingCanvas = false;
                    let startX = 0;
                    let scrollLeftStart = 0;
                    
                    
                    const axis = document.getElementById('analytics-timeline-axis');
                    if (axis) {
                        axis.addEventListener('click', (e) => {
                            const rect = innerChart.getBoundingClientRect();
                            let x = e.clientX - rect.left;
                            if (x < 0) x = 0;
                            if (x > totalWidth) x = totalWidth;
                            
                            if (scrubber) scrubber.style.left = \`\${x}px\`;
                            if (scrubberHandle) {
                                scrubberHandle.style.left = \`\${x}px\`;
                                const currentYear = pxToYear(x);
                                scrubberHandle.textContent = Math.round(currentYear);
                                updateAliveList(currentYear);
                            }
                        });
                    }
                    
                    if (scrubber) {
                        scrubberHandle.addEventListener('mousedown', (e) => {
                            isDraggingScrubber = true;
                            document.body.style.userSelect = 'none';
                            e.stopPropagation();
                        });
                        
                        document.addEventListener('mousemove', (e) => {
                            if (!isDraggingScrubber) return;
                            const rect = innerChart.getBoundingClientRect();
                            let x = e.clientX - rect.left;
                            if (x < 0) x = 0;
                            if (x > totalWidth) x = totalWidth;
                            
                            scrubber.style.left = \`\${x}px\`;
                            if (scrubberHandle) scrubberHandle.style.left = \`\${x}px\`;
                            
                            const currentYear = pxToYear(x);
                            scrubberHandle.textContent = Math.round(currentYear);
                            updateAliveList(currentYear);
                            
                            // Auto scroll if dragging near edges
                            const containerRect = chartContainer.getBoundingClientRect();
                            if (e.clientX < containerRect.left + 50) {
                                chartContainer.scrollLeft -= 10;
                            } else if (e.clientX > containerRect.right - 50) {
                                chartContainer.scrollLeft += 10;
                            }
                        });
                        
                        document.addEventListener('mouseup', () => {
                            if (isDraggingScrubber) {
                                isDraggingScrubber = false;
                                document.body.style.userSelect = '';
                            }
                        });
                    }`;

const newDragLogic = `                    // Scrubber Drag Logic
                    const innerChart = document.getElementById('analytics-timeline-chart-inner');
                    const axis = document.getElementById('analytics-timeline-axis');
                    
                    let draggedHandle = null; // 'single', 'start', 'end', 'area'
                    let dragStartX = 0;
                    let initialStartYear = 0;
                    let initialEndYear = 0;
                    let isDraggingCanvas = false;
                    let startX = 0;
                    let scrollLeftStart = 0;
                    
                    if (axis) {
                        axis.addEventListener('mousedown', (e) => {
                            const handle = e.target.closest('[id^="timeline-scrubber-handle"]');
                            const area = e.target.closest('#timeline-scrubber-drag-area');
                            
                            if (handle) {
                                draggedHandle = handle.getAttribute('data-type');
                                document.body.style.userSelect = 'none';
                                e.stopPropagation();
                            } else if (area) {
                                draggedHandle = 'area';
                                const rect = innerChart.getBoundingClientRect();
                                dragStartX = e.clientX - rect.left;
                                initialStartYear = scrubberStartYear;
                                initialEndYear = scrubberEndYear;
                                document.body.style.userSelect = 'none';
                                e.stopPropagation();
                            } else {
                                if (scrubberMode === "year") {
                                    const rect = innerChart.getBoundingClientRect();
                                    let x = e.clientX - rect.left;
                                    if (x < 0) x = 0;
                                    if (x > totalWidth) x = totalWidth;
                                    
                                    scrubberStartYear = pxToYear(x);
                                    updateAliveList(scrubberStartYear);
                                    
                                    // Update DOM directly for single mode fast response
                                    const h = document.getElementById('timeline-scrubber-handle');
                                    const l = document.getElementById('timeline-scrubber');
                                    if (h) {
                                        h.style.left = \`\${x}px\`;
                                        h.textContent = Math.round(scrubberStartYear);
                                    }
                                    if (l) l.style.left = \`\${x}px\`;
                                }
                            }
                        });
                    }
                    
                    const onScrubberMouseMove = (e) => {
                        if (!draggedHandle) return;
                        
                        const rect = innerChart.getBoundingClientRect();
                        let x = e.clientX - rect.left;
                        if (x < 0) x = 0;
                        if (x > totalWidth) x = totalWidth;
                        
                        if (draggedHandle === 'single') {
                            scrubberStartYear = pxToYear(x);
                            updateAliveList(scrubberStartYear);
                            
                            const h = document.getElementById('timeline-scrubber-handle');
                            const l = document.getElementById('timeline-scrubber');
                            if (h) {
                                h.style.left = \`\${x}px\`;
                                h.textContent = Math.round(scrubberStartYear);
                            }
                            if (l) l.style.left = \`\${x}px\`;
                        } else if (draggedHandle === 'start' || draggedHandle === 'end') {
                            const newYear = pxToYear(x);
                            if (draggedHandle === 'start') {
                                scrubberStartYear = newYear;
                            } else {
                                scrubberEndYear = newYear;
                            }
                            
                            updateAliveList(scrubberStartYear, scrubberEndYear);
                            
                            const hs = document.getElementById('timeline-scrubber-handle-start');
                            const he = document.getElementById('timeline-scrubber-handle-end');
                            const bg = document.getElementById('timeline-scrubber-bg');
                            const area = document.getElementById('timeline-scrubber-drag-area');
                            
                            const p1 = yearToPx(scrubberStartYear);
                            const p2 = yearToPx(scrubberEndYear);
                            
                            if (draggedHandle === 'start' && hs) {
                                hs.style.left = \`\${p1}px\`;
                                hs.textContent = Math.round(scrubberStartYear);
                            }
                            if (draggedHandle === 'end' && he) {
                                he.style.left = \`\${p2}px\`;
                                he.textContent = Math.round(scrubberEndYear);
                            }
                            
                            if (bg && area) {
                                const minP = Math.min(p1, p2);
                                const maxP = Math.max(p1, p2);
                                bg.style.left = \`\${minP}px\`;
                                bg.style.width = \`\${maxP - minP}px\`;
                                area.style.left = \`\${minP}px\`;
                                area.style.width = \`\${maxP - minP}px\`;
                            }
                            
                        } else if (draggedHandle === 'area') {
                            const diffX = x - dragStartX;
                            const diffYear = sortDesc ? -(diffX / ypx) : (diffX / ypx);
                            
                            scrubberStartYear = initialStartYear + diffYear;
                            scrubberEndYear = initialEndYear + diffYear;
                            
                            updateAliveList(scrubberStartYear, scrubberEndYear);
                            
                            const p1 = yearToPx(scrubberStartYear);
                            const p2 = yearToPx(scrubberEndYear);
                            
                            const hs = document.getElementById('timeline-scrubber-handle-start');
                            const he = document.getElementById('timeline-scrubber-handle-end');
                            const bg = document.getElementById('timeline-scrubber-bg');
                            const area = document.getElementById('timeline-scrubber-drag-area');
                            
                            if (hs) { hs.style.left = \`\${p1}px\`; hs.textContent = Math.round(scrubberStartYear); }
                            if (he) { he.style.left = \`\${p2}px\`; he.textContent = Math.round(scrubberEndYear); }
                            if (bg && area) {
                                const minP = Math.min(p1, p2);
                                const maxP = Math.max(p1, p2);
                                bg.style.left = \`\${minP}px\`;
                                bg.style.width = \`\${maxP - minP}px\`;
                                area.style.left = \`\${minP}px\`;
                                area.style.width = \`\${maxP - minP}px\`;
                            }
                        }
                        
                        // Auto scroll if dragging near edges
                        const containerRect = chartContainer.getBoundingClientRect();
                        if (e.clientX < containerRect.left + 50) {
                            chartContainer.scrollLeft -= 10;
                        } else if (e.clientX > containerRect.right - 50) {
                            chartContainer.scrollLeft += 10;
                        }
                    };
                    
                    const onScrubberMouseUp = () => {
                        if (draggedHandle) {
                            draggedHandle = null;
                            document.body.style.userSelect = '';
                        }
                    };
                    
                    // We need to attach to document for smooth dragging outside the chart
                    // Prevent memory leaks by cleaning up on re-render (optional, but safe here due to how we render)
                    // We will store refs to remove later or just rely on the fact that these are attached once per renderTimelineChart.
                    // Actually, re-rendering will add multiple listeners if not careful.
                    // Better to attach them to a parent or use a single global listener, but for now we can namespace them if needed.
                    
                    // Let's attach to document but we need to ensure we don't leak.
                    // A simple way is to name the functions and remove them first.
                    document.removeEventListener('mousemove', window._timelineMouseMove);
                    document.removeEventListener('mouseup', window._timelineMouseUp);
                    
                    window._timelineMouseMove = onScrubberMouseMove;
                    window._timelineMouseUp = onScrubberMouseUp;
                    
                    document.addEventListener('mousemove', window._timelineMouseMove);
                    document.addEventListener('mouseup', window._timelineMouseUp);
`;

js = js.replace(oldDragLogic, newDragLogic);

// 7. Add Mode Toggle Logic inside renderTimeline (or outside so it works globally)
const toggleLogic = `
            const btnYear = document.getElementById("scrubber-mode-year-btn");
            const btnPeriod = document.getElementById("scrubber-mode-period-btn");
            if (btnYear && btnPeriod) {
                const updateModeStyles = () => {
                    if (scrubberMode === "year") {
                        btnYear.style.background = 'var(--color-primary)';
                        btnYear.style.color = 'white';
                        btnPeriod.style.background = 'transparent';
                        btnPeriod.style.color = 'var(--color-text-main)';
                    } else {
                        btnPeriod.style.background = 'var(--color-primary)';
                        btnPeriod.style.color = 'white';
                        btnYear.style.background = 'transparent';
                        btnYear.style.color = 'var(--color-text-main)';
                    }
                };
                updateModeStyles();
                
                btnYear.addEventListener("click", () => {
                    scrubberMode = "year";
                    updateModeStyles();
                    renderTimelineChart();
                });
                btnPeriod.addEventListener("click", () => {
                    scrubberMode = "period";
                    if (scrubberEndYear === null || scrubberEndYear === undefined) {
                        scrubberEndYear = scrubberStartYear + 10; // Default period length 10 years
                    }
                    updateModeStyles();
                    renderTimelineChart();
                });
            }
`;

// Insert the toggleLogic just before `renderTimelineChart();` is called at the end of `renderTimeline` function.
// Let's insert it inside `if (btnSort)` area.
js = js.replace(
`            const selectFilter = document.getElementById("timeline-filter-type");`,
`            ${toggleLogic}
            const selectFilter = document.getElementById("timeline-filter-type");`
);


fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js, 'utf8');
console.log("Patched successfully.");
