const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldApply = `            if (applyPeriodBtn) {
                applyPeriodBtn.addEventListener("click", () => {
                    let newStart = scrubberStartYear;
                    let newEnd = scrubberEndYear;
                    
                    if (minInput && minInput.value) newStart = parseInt(minInput.value, 10);
                    if (scrubberMode === "period" && maxInput && maxInput.value) newEnd = parseInt(maxInput.value, 10);
                    
                    if (scrubberMode === "period" && newStart > newEnd) {
                        const temp = newStart;
                        newStart = newEnd;
                        newEnd = temp;
                    }
                    
                    scrubberStartYear = newStart;
                    scrubberEndYear = newEnd;
                    
                    applyPeriodBtn.style.display = 'none';
                    updateTimelineUrl();
                    renderTimelineChart();
                });
            }`;

const newApply = `            if (applyPeriodBtn) {
                applyPeriodBtn.addEventListener("click", () => {
                    let newStart = scrubberStartYear;
                    let newEnd = scrubberEndYear;
                    
                    if (minInput && minInput.value) newStart = parseInt(minInput.value, 10);
                    if (scrubberMode === "period" && maxInput && maxInput.value) newEnd = parseInt(maxInput.value, 10);
                    
                    if (scrubberMode === "period" && newStart > newEnd) {
                        const temp = newStart;
                        newStart = newEnd;
                        newEnd = temp;
                    }
                    
                    const cy = new Date().getFullYear();
                    if (newStart > cy) newStart = cy;
                    if (newEnd > cy) newEnd = cy;
                    
                    scrubberStartYear = newStart;
                    scrubberEndYear = newEnd;
                    
                    applyPeriodBtn.style.display = 'none';
                    updateTimelineUrl();
                    renderTimelineChart();
                });
            }`;

if (js.includes(oldApply)) {
    js = js.replace(oldApply, newApply);
    console.log("Patched apply btn cap");
} else {
    console.log("Could not find oldApply");
}
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js, 'utf8');
