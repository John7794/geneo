const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldAxis = `                                const clickedYear = pxToYear(x);
                                
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
                                    
                                    updateAliveList(scrubberStartYear, scrubberEndYear);`;

const newAxis = `                                let clickedYear = pxToYear(x);
                                const cy = new Date().getFullYear();
                                if (clickedYear > cy) clickedYear = cy;
                                x = yearToPx(clickedYear);
                                
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
                                    
                                    updateAliveList(scrubberStartYear, scrubberEndYear);`;

if (js.includes(oldAxis)) {
    js = js.replace(oldAxis, newAxis);
    console.log("Patched axis cap");
} else {
    console.log("Could not find oldAxis");
}
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js, 'utf8');
