const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldRenderBlock = `                if (chartPeriodMin !== null && !isNaN(chartPeriodMin)) minYear = chartPeriodMin;
                if (chartPeriodMax !== null && !isNaN(chartPeriodMax)) maxYear = chartPeriodMax;
                
                let currentYear = new Date().getFullYear();
                if (scrubberStartYear === null) { scrubberStartYear = currentYear; updateTimelineUrl(); }
                if (scrubberEndYear === null) { scrubberEndYear = currentYear; updateTimelineUrl(); }
                if (scrubberStartYear > maxYear) maxYear = scrubberStartYear;
                if (scrubberEndYear > maxYear) maxYear = scrubberEndYear;
                if (scrubberStartYear < minYear) minYear = scrubberStartYear;
                
                // Set input values if not already set
                const minInput = document.getElementById("timeline-chart-min-year");
                const maxInput = document.getElementById("timeline-chart-max-year");
                if (minInput && !minInput.value) minInput.value = minYear;
                if (maxInput && !maxInput.value) maxInput.value = maxYear;`;

const newRenderBlock = `                let currentYear = new Date().getFullYear();
                if (scrubberStartYear === null) { scrubberStartYear = currentYear; updateTimelineUrl(); }
                if (scrubberEndYear === null) { scrubberEndYear = currentYear; updateTimelineUrl(); }
                
                if (scrubberStartYear > maxYear) maxYear = scrubberStartYear + 10;
                if (scrubberEndYear > maxYear) maxYear = scrubberEndYear + 10;
                if (scrubberStartYear < minYear) minYear = scrubberStartYear - 10;
                
                const localMinInput = document.getElementById("timeline-chart-min-year");
                const localMaxInput = document.getElementById("timeline-chart-max-year");
                if (localMinInput) localMinInput.value = Math.round(scrubberStartYear);
                if (localMaxInput) localMaxInput.value = Math.round(scrubberEndYear);
                
                const localDash = document.getElementById("timeline-chart-dash");
                if (scrubberMode === "year") {
                    if (localMaxInput) localMaxInput.style.display = 'none';
                    if (localDash) localDash.style.display = 'none';
                } else {
                    if (localMaxInput) localMaxInput.style.display = 'inline-block';
                    if (localDash) localDash.style.display = 'inline-block';
                }`;
js = js.replace(oldRenderBlock, newRenderBlock);

const oldUpdateMode = `                const updateModeStyles = () => {
                    const periodFilter = document.getElementById("timeline-chart-period-filter");
                    if (scrubberMode === "year") {
                        btnYear.style.background = 'var(--color-primary)';
                        btnYear.style.color = 'white';
                        btnPeriod.style.background = 'transparent';
                        btnPeriod.style.color = 'var(--color-text-main)';
                        if (periodFilter) periodFilter.style.display = 'none';
                    } else {
                        btnPeriod.style.background = 'var(--color-primary)';
                        btnPeriod.style.color = 'white';
                        btnYear.style.background = 'transparent';
                        btnYear.style.color = 'var(--color-text-main)';
                        if (periodFilter) periodFilter.style.display = 'inline-flex';
                    }
                };`;

const newUpdateMode = `                const updateModeStyles = () => {
                    const periodFilter = document.getElementById("timeline-chart-period-filter");
                    const maxInput = document.getElementById("timeline-chart-max-year");
                    const dashInput = document.getElementById("timeline-chart-dash");
                    
                    if (scrubberMode === "year") {
                        btnYear.style.background = 'var(--color-primary)';
                        btnYear.style.color = 'white';
                        btnPeriod.style.background = 'transparent';
                        btnPeriod.style.color = 'var(--color-text-main)';
                        if (maxInput) maxInput.style.display = 'none';
                        if (dashInput) dashInput.style.display = 'none';
                        if (periodFilter) periodFilter.style.display = 'inline-flex';
                    } else {
                        btnPeriod.style.background = 'var(--color-primary)';
                        btnPeriod.style.color = 'white';
                        btnYear.style.background = 'transparent';
                        btnYear.style.color = 'var(--color-text-main)';
                        if (maxInput) maxInput.style.display = 'inline-block';
                        if (dashInput) dashInput.style.display = 'inline-block';
                        if (periodFilter) periodFilter.style.display = 'inline-flex';
                    }
                    if (typeof checkInputs !== 'undefined') checkInputs();
                };`;

js = js.replace(oldUpdateMode, newUpdateMode);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js, 'utf8');
