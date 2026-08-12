const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

// 1. Add state variables for chart period
code = code.replace('let timelineViewMode = this.timelineViewMode;', 'let timelineViewMode = this.timelineViewMode;\n            let chartPeriodMin = null;\n            let chartPeriodMax = null;');

// 2. Add elements to updateButtonStyles
code = code.replace('const updateButtonStyles = () => {', 'const periodFilterEl = document.getElementById("timeline-chart-period-filter");\n                const updateButtonStyles = () => {');

code = code.replace(
`                        if (filterTypeSelect) filterTypeSelect.style.display = 'inline-flex';
                        if (sortBtn) sortBtn.style.display = 'inline-flex';
                    } else {`,
`                        if (filterTypeSelect) filterTypeSelect.style.display = 'inline-flex';
                        if (sortBtn) sortBtn.style.display = 'inline-flex';
                        if (periodFilterEl) periodFilterEl.style.display = 'none';
                    } else {`
);

code = code.replace(
`                        if (filterTypeSelect) filterTypeSelect.style.display = 'none';
                        if (sortBtn) sortBtn.style.display = 'none';
                    }`,
`                        if (filterTypeSelect) filterTypeSelect.style.display = 'none';
                        if (sortBtn) sortBtn.style.display = 'none';
                        if (periodFilterEl) periodFilterEl.style.display = 'inline-flex';
                    }`
);

// 3. Add event listeners for period filter
code = code.replace(
`            const renderTimelineChart = () => {`,
`            const applyPeriodBtn = document.getElementById("timeline-chart-apply-btn");
            if (applyPeriodBtn) {
                applyPeriodBtn.addEventListener("click", () => {
                    const minInput = document.getElementById("timeline-chart-min-year");
                    const maxInput = document.getElementById("timeline-chart-max-year");
                    chartPeriodMin = minInput.value ? parseInt(minInput.value, 10) : null;
                    chartPeriodMax = maxInput.value ? parseInt(maxInput.value, 10) : null;
                    renderTimelineChart();
                });
            }
            
            const renderTimelineChart = () => {`
);

// 4. In renderTimelineChart, apply chartPeriodMin and chartPeriodMax
// First, find where validPeople is calculated:
// const validPeople = Object.values(personEvents).filter(p => p.birth !== null || p.death !== null);
// We change the minYear and maxYear logic there:

let targetLogicOld = `                validPeople.forEach(p => {
                    let by = p.birth;
                    let dy = p.death;
                    if (by !== null && dy === null) dy = by + 70;
                    else if (dy !== null && by === null) by = dy - 70;
                    
                    if (by < minYear) minYear = by;
                });
                
                minYear -= 10;
                const maxYear = 2026; // Strictly cut by current year`;

let targetLogicNew = `                validPeople.forEach(p => {
                    let by = p.birth;
                    let dy = p.death;
                    if (by !== null && dy === null) dy = by + 70;
                    else if (dy !== null && by === null) by = dy - 70;
                    
                    if (by < minYear) minYear = by;
                });
                
                minYear -= 10;
                let maxYear = 2026; // Default strictly cut by current year
                
                if (chartPeriodMin !== null && !isNaN(chartPeriodMin)) minYear = chartPeriodMin;
                if (chartPeriodMax !== null && !isNaN(chartPeriodMax)) maxYear = chartPeriodMax;
                
                // Set input values if not already set
                const minInput = document.getElementById("timeline-chart-min-year");
                const maxInput = document.getElementById("timeline-chart-max-year");
                if (minInput && !minInput.value) minInput.value = minYear;
                if (maxInput && !maxInput.value) maxInput.value = maxYear;
`;

code = code.replace(targetLogicOld, targetLogicNew);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code, 'utf8');
console.log('Patched analyticsManager.js successfully.');
