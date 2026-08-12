const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldCode = `                const updateModeStyles = () => {
                    if (scrubberMode === "year") {
                        btnYear.style.background = 'var(--color-primary)';
                        btnYear.style.color = 'white';
                        btnPeriod.style.background = 'transparent';
                        btnPeriod.style.color = 'var(--color-text-main)';
                        if (periodFilterEl) periodFilterEl.style.display = 'none';
                    } else {
                        btnPeriod.style.background = 'var(--color-primary)';
                        btnPeriod.style.color = 'white';
                        btnYear.style.background = 'transparent';
                        btnYear.style.color = 'var(--color-text-main)';
                        if (periodFilterEl) periodFilterEl.style.display = 'inline-flex';
                    }
                };`;

const newCode = `                const updateModeStyles = () => {
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

js = js.replace(oldCode, newCode);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js, 'utf8');
console.log("Fixed scope");
