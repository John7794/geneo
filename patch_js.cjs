const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldCode = `                let currentYear = new Date().getFullYear();
                if (scrubberStartYear === null) { scrubberStartYear = currentYear; updateTimelineUrl(); }
                if (scrubberEndYear === null) { scrubberEndYear = currentYear; updateTimelineUrl(); }
                if (scrubberStartYear > maxYear) maxYear = scrubberStartYear;
                if (scrubberEndYear > maxYear) maxYear = scrubberEndYear;
                if (scrubberStartYear < minYear) minYear = scrubberStartYear;`;

const newCode = `                let currentYear = new Date().getFullYear();
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

js = js.replace(oldCode, newCode);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js, 'utf8');
