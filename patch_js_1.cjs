const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

// 1. Remove chartPeriodMin/Max declaration
js = js.replace('let chartPeriodMin = null;\n            let chartPeriodMax = null;', '');

// 2. Fix the apply button logic and add input listeners
const oldApplyBlock = `            const applyPeriodBtn = document.getElementById("timeline-chart-apply-btn");
            if (applyPeriodBtn) {
                applyPeriodBtn.addEventListener("click", () => {
                    const minInput = document.getElementById("timeline-chart-min-year");
                    const maxInput = document.getElementById("timeline-chart-max-year");
                    chartPeriodMin = minInput.value ? parseInt(minInput.value, 10) : null;
                    chartPeriodMax = maxInput.value ? parseInt(maxInput.value, 10) : null;
                    renderTimelineChart();
                });
            }`;

const newApplyBlock = `            const applyPeriodBtn = document.getElementById("timeline-chart-apply-btn");
            const minInput = document.getElementById("timeline-chart-min-year");
            const maxInput = document.getElementById("timeline-chart-max-year");
            const dashInput = document.getElementById("timeline-chart-dash");
            
            const checkInputs = () => {
                if (!applyPeriodBtn) return;
                let changed = false;
                if (minInput && minInput.value && parseInt(minInput.value, 10) !== Math.round(scrubberStartYear)) changed = true;
                if (scrubberMode === "period" && maxInput && maxInput.value && parseInt(maxInput.value, 10) !== Math.round(scrubberEndYear)) changed = true;
                
                if (changed) {
                    applyPeriodBtn.style.display = 'inline-block';
                } else {
                    applyPeriodBtn.style.display = 'none';
                }
            };

            if (minInput) minInput.addEventListener("input", checkInputs);
            if (maxInput) maxInput.addEventListener("input", checkInputs);

            if (applyPeriodBtn) {
                applyPeriodBtn.addEventListener("click", () => {
                    if (minInput && minInput.value) scrubberStartYear = parseInt(minInput.value, 10);
                    if (scrubberMode === "period" && maxInput && maxInput.value) scrubberEndYear = parseInt(maxInput.value, 10);
                    applyPeriodBtn.style.display = 'none';
                    updateTimelineUrl();
                    renderTimelineChart();
                });
            }`;
js = js.replace(oldApplyBlock, newApplyBlock);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js, 'utf8');
