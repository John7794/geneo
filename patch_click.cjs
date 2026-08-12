const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldClickLogic = `                            } else {
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
                            }`;

const newClickLogic = `                            } else {
                                const rect = innerChart.getBoundingClientRect();
                                let x = e.clientX - rect.left;
                                if (x < 0) x = 0;
                                if (x > totalWidth) x = totalWidth;
                                const clickedYear = pxToYear(x);
                                
                                if (scrubberMode === "year") {
                                    scrubberStartYear = clickedYear;
                                    updateAliveList(scrubberStartYear);
                                    
                                    // Update DOM directly for single mode fast response
                                    const h = document.getElementById('timeline-scrubber-handle');
                                    const l = document.getElementById('timeline-scrubber');
                                    if (h) {
                                        h.style.left = \`\${x}px\`;
                                        h.textContent = Math.round(scrubberStartYear);
                                    }
                                    if (l) l.style.left = \`\${x}px\`;
                                    updateTimelineUrl();
                                } else {
                                    // Period mode: expand/shrink the closest boundary
                                    if (Math.abs(clickedYear - scrubberStartYear) < Math.abs(clickedYear - scrubberEndYear)) {
                                        scrubberStartYear = clickedYear;
                                    } else {
                                        scrubberEndYear = clickedYear;
                                    }
                                    
                                    updateAliveList(scrubberStartYear, scrubberEndYear);
                                    
                                    // Update DOM directly for period mode fast response
                                    const hs = document.getElementById('timeline-scrubber-handle-start');
                                    const he = document.getElementById('timeline-scrubber-handle-end');
                                    const bg = document.getElementById('timeline-scrubber-bg');
                                    const area = document.getElementById('timeline-scrubber-drag-area');
                                    
                                    const p1 = yearToPx(scrubberStartYear);
                                    const p2 = yearToPx(scrubberEndYear);
                                    
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
                                    updateTimelineUrl();
                                }
                            }`;

js = js.replace(oldClickLogic, newClickLogic);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js, 'utf8');
console.log("Applied click patch.");
