const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldDrag = `                        if (draggedHandle === 'single') {
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
                        }`;

const newDrag = `                        const cy = new Date().getFullYear();
                        if (draggedHandle === 'single') {
                            let ny = pxToYear(x);
                            if (ny > cy) ny = cy;
                            scrubberStartYear = ny;
                            x = yearToPx(ny);
                            updateAliveList(scrubberStartYear);
                            
                            const h = document.getElementById('timeline-scrubber-handle');
                            const l = document.getElementById('timeline-scrubber');
                            if (h) {
                                h.style.left = \`\${x}px\`;
                                h.textContent = Math.round(scrubberStartYear);
                            }
                            if (l) l.style.left = \`\${x}px\`;
                        } else if (draggedHandle === 'start' || draggedHandle === 'end') {
                            let newYear = pxToYear(x);
                            if (newYear > cy) newYear = cy;
                            
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
                            let diffYear = sortDesc ? -(diffX / ypx) : (diffX / ypx);
                            
                            let newStart = initialStartYear + diffYear;
                            let newEnd = initialEndYear + diffYear;
                            
                            const maxOfBoth = Math.max(newStart, newEnd);
                            if (maxOfBoth > cy) {
                                const adjustment = maxOfBoth - cy;
                                newStart -= adjustment;
                                newEnd -= adjustment;
                            }
                            
                            scrubberStartYear = newStart;
                            scrubberEndYear = newEnd;
                            
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
                        }`;

if (js.includes(oldDrag)) {
    js = js.replace(oldDrag, newDrag);
    console.log("Patched drag caps");
} else {
    console.log("Could not find oldDrag");
}
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js, 'utf8');
