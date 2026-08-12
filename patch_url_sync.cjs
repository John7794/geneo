const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const readUrlParamsCode = `
            const urlParams = new URLSearchParams(window.location.search);
            let scrubberMode = urlParams.get("timeline_mode") || "year";
            let scrubberStartYear = urlParams.get("timeline_start") ? parseFloat(urlParams.get("timeline_start")) : null;
            let scrubberEndYear = urlParams.get("timeline_end") ? parseFloat(urlParams.get("timeline_end")) : null;
            
            const updateTimelineUrl = () => {
                const newUrl = new URL(window.location);
                newUrl.searchParams.set("timeline_mode", scrubberMode);
                if (scrubberStartYear !== null) newUrl.searchParams.set("timeline_start", Math.round(scrubberStartYear));
                if (scrubberEndYear !== null) newUrl.searchParams.set("timeline_end", Math.round(scrubberEndYear));
                window.history.replaceState({}, '', newUrl);
            };
`;

js = js.replace(
    'let scrubberMode = "year";\n            let scrubberStartYear = null;\n            let scrubberEndYear = null;',
    readUrlParamsCode
);

// We also need to set default if it's null inside the render loop or before.
// In the current code:
// if (scrubberStartYear === null) scrubberStartYear = maxYear;
// if (scrubberEndYear === null) scrubberEndYear = maxYear;
// Let's modify it to update the URL after it sets the default.

const defaultSetterOld = `    if (scrubberStartYear === null) scrubberStartYear = maxYear;
    if (scrubberEndYear === null) scrubberEndYear = maxYear;`;

const defaultSetterNew = `    if (scrubberStartYear === null) { scrubberStartYear = maxYear; updateTimelineUrl(); }
    if (scrubberEndYear === null) { scrubberEndYear = maxYear; updateTimelineUrl(); }`;

js = js.replace(defaultSetterOld, defaultSetterNew);

// Now, update URL on drag end and mode change
// Inside btnYear and btnPeriod click listeners:
js = js.replace(
    /btnYear\.addEventListener\("click", \(\) => {([\s\S]*?)renderTimelineChart\(\);\n                }\);/,
    `btnYear.addEventListener("click", () => {$1renderTimelineChart(); updateTimelineUrl();\n                });`
);
js = js.replace(
    /btnPeriod\.addEventListener\("click", \(\) => {([\s\S]*?)renderTimelineChart\(\);\n                }\);/,
    `btnPeriod.addEventListener("click", () => {$1renderTimelineChart(); updateTimelineUrl();\n                });`
);

// Inside onScrubberMouseUp
js = js.replace(
    `                    const onScrubberMouseUp = () => {
                        if (draggedHandle) {
                            draggedHandle = null;
                            document.body.style.userSelect = '';
                        }
                    };`,
    `                    const onScrubberMouseUp = () => {
                        if (draggedHandle) {
                            draggedHandle = null;
                            document.body.style.userSelect = '';
                            updateTimelineUrl();
                        }
                    };`
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js, 'utf8');
console.log("URL sync patched successfully.");
