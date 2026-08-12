const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldAlive = `                    const updateAliveList = (y1, y2) => {
                        if (!valDisplay || !resultsBox) return;
                        if (y2 === undefined || y1 === y2) {
                            valDisplay.textContent = Math.round(y1);
                        } else {
                            valDisplay.textContent = \`\${Math.min(Math.round(y1), Math.round(y2))} - \${Math.max(Math.round(y1), Math.round(y2))}\`;
                        }`;

const newAlive = `                    const updateAliveList = (y1, y2) => {
                        if (!valDisplay || !resultsBox) return;
                        
                        // Update the filter inputs directly when scrubbing!
                        const minInp = document.getElementById("timeline-chart-min-year");
                        const maxInp = document.getElementById("timeline-chart-max-year");
                        const sVal = Math.round(y1);
                        const eVal = y2 !== undefined ? Math.round(y2) : sVal;
                        
                        if (minInp && document.activeElement !== minInp) minInp.value = Math.min(sVal, eVal);
                        if (maxInp && document.activeElement !== maxInp) maxInp.value = Math.max(sVal, eVal);
                        
                        if (typeof checkInputs !== 'undefined') checkInputs();

                        if (y2 === undefined || y1 === y2) {
                            valDisplay.textContent = Math.round(y1);
                        } else {
                            valDisplay.textContent = \`\${Math.min(Math.round(y1), Math.round(y2))} - \${Math.max(Math.round(y1), Math.round(y2))}\`;
                        }`;

if (js.includes(oldAlive)) {
    js = js.replace(oldAlive, newAlive);
    console.log("Patched alive list");
} else {
    console.log("Could not find oldAlive");
}
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js, 'utf8');
