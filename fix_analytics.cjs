const fs = require('fs');

// 1. Update index.html
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(
    `<div id="timeline-chart-period-filter" style="display: none; align-items: center; gap: 8px;"><input type="number" id="timeline-chart-min-year" class="btn-outline btn-sm" style="width: 70px; height: 38px; background: transparent; color: var(--color-text-main); border: 1px solid var(--color-border); border-radius: 8px; padding: 0 8px;" placeholder="Від" title="Початковий рік"><span style="color: var(--color-text-muted);">-</span><input type="number" id="timeline-chart-max-year" class="btn-outline btn-sm" style="width: 70px; height: 38px; background: transparent; color: var(--color-text-main); border: 1px solid var(--color-border); border-radius: 8px; padding: 0 8px;" placeholder="До" title="Кінцевий рік"><button id="timeline-chart-apply-btn" class="btn btn-sm" style="height: 38px; background: var(--color-primary); color: white; border: none; border-radius: 8px;">Застосувати</button></div>`,
    ""
);
fs.writeFileSync('index.html', html, 'utf8');


// 2. Update analyticsManager.js
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldPeriodBlock = `                if (chartPeriodMin !== null && !isNaN(chartPeriodMin)) minYear = chartPeriodMin;
                if (chartPeriodMax !== null && !isNaN(chartPeriodMax)) maxYear = chartPeriodMax;
                
                // Set input values if not already set
                const minInput = document.getElementById("timeline-chart-min-year");
                const maxInput = document.getElementById("timeline-chart-max-year");
                if (minInput && !minInput.value) minInput.value = minYear;
                if (maxInput && !maxInput.value) maxInput.value = maxYear;`;

const newPeriodBlock = `                if (chartPeriodMin !== null && !isNaN(chartPeriodMin)) minYear = chartPeriodMin;
                if (chartPeriodMax !== null && !isNaN(chartPeriodMax)) maxYear = chartPeriodMax;
                
                let currentYear = new Date().getFullYear();
                if (scrubberStartYear === null) { scrubberStartYear = currentYear; updateTimelineUrl(); }
                if (scrubberEndYear === null) { scrubberEndYear = currentYear; updateTimelineUrl(); }
                if (scrubberStartYear > maxYear) maxYear = scrubberStartYear;
                if (scrubberEndYear > maxYear) maxYear = scrubberEndYear;
                if (scrubberStartYear < minYear) minYear = scrubberStartYear;`;

js = js.replace(oldPeriodBlock, newPeriodBlock);


const oldHandleBlock = `    const scrubberHandleHtml = \`
        <div id="timeline-scrubber-handle" style="position: absolute; top: 0; left: \${yearToPx(maxYear)}px; margin-left: -14px; width: 30px; height: 30px; background: var(--color-primary); border-radius: 50%; color: white; font-size: 10px; font-weight: bold; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); user-select: none; cursor: ew-resize;">
            \${maxYear}
        </div>
    \`;
    const scrubberLineHtml = \`
        <div id="timeline-scrubber" style="position: absolute; top: 0; bottom: 0; left: \${yearToPx(maxYear)}px; width: 2px; background: var(--color-primary); z-index: 50; cursor: ew-resize; pointer-events: none;">
        </div>
    \`;
    
    axisHtml += scrubberHandleHtml + "</div>";`;


const newHandleBlock = `    let scrubberUIHtml = "";
    if (scrubberStartYear === null) scrubberStartYear = currentYear;
    if (scrubberEndYear === null) scrubberEndYear = currentYear;

    if (scrubberMode === "year") {
        scrubberUIHtml = \`
            <div id="timeline-scrubber-handle" data-type="single" style="position: absolute; top: 0; left: \${yearToPx(scrubberStartYear)}px; margin-left: -14px; width: 30px; height: 30px; background: var(--color-primary); border-radius: 50%; color: white; font-size: 10px; font-weight: bold; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); user-select: none; cursor: ew-resize; z-index: 52;">
                \${Math.round(scrubberStartYear)}
            </div>
        \`;
    } else {
        const p1 = Math.min(yearToPx(scrubberStartYear), yearToPx(scrubberEndYear));
        const p2 = Math.max(yearToPx(scrubberStartYear), yearToPx(scrubberEndYear));
        const w = p2 - p1;
        
        scrubberUIHtml = \`
            <div id="timeline-scrubber-bg" style="position: absolute; top: 30px; bottom: -9999px; left: \${p1}px; width: \${w}px; background: rgba(30, 136, 229, 0.1); z-index: 10; pointer-events: none; border-left: 1px dashed var(--color-primary); border-right: 1px dashed var(--color-primary);"></div>
            
            <div id="timeline-scrubber-handle-start" data-type="start" style="position: absolute; top: 0; left: \${yearToPx(scrubberStartYear)}px; margin-left: -14px; width: 30px; height: 30px; background: var(--color-primary); border-radius: 50%; color: white; font-size: 10px; font-weight: bold; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); user-select: none; cursor: ew-resize; z-index: 52;">
                \${Math.round(scrubberStartYear)}
            </div>
            
            <div id="timeline-scrubber-handle-end" data-type="end" style="position: absolute; top: 0; left: \${yearToPx(scrubberEndYear)}px; margin-left: -14px; width: 30px; height: 30px; background: var(--color-primary); border-radius: 50%; color: white; font-size: 10px; font-weight: bold; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); user-select: none; cursor: ew-resize; z-index: 52;">
                \${Math.round(scrubberEndYear)}
            </div>
            
            <div id="timeline-scrubber-drag-area" style="position: absolute; top: 0; left: \${p1}px; width: \${w}px; height: 30px; background: rgba(30, 136, 229, 0.2); cursor: move; z-index: 51;"></div>
        \`;
    }
    
    let scrubberLineHtml = "";
    if (scrubberMode === "year") {
        scrubberLineHtml = \`
            <div id="timeline-scrubber" style="position: absolute; top: 0; bottom: 0; left: \${yearToPx(scrubberStartYear)}px; width: 2px; background: var(--color-primary); z-index: 50; pointer-events: none;">
            </div>
        \`;
    }
    
    axisHtml += scrubberUIHtml + "</div>" + scrubberLineHtml;`;

js = js.replace(oldHandleBlock, newHandleBlock);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js, 'utf8');
console.log("Fixes applied.");
