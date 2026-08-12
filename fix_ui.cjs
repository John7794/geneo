const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

// Fix duplicate line
js = js.replace('axisHtml += scrubberUIHtml + "</div>" + scrubberLineHtml;', 'axisHtml += scrubberUIHtml + "</div>";');

// Fix period filter visibility
const oldUpdateModeStyles = `                const updateModeStyles = () => {
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
                };`;

const newUpdateModeStyles = `                const updateModeStyles = () => {
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

js = js.replace(oldUpdateModeStyles, newUpdateModeStyles);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js, 'utf8');
console.log("Fixes applied");
