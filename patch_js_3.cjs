const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

// We need to find `updateAliveList` calls and update the input values
// But since there are multiple places (click, drag single, drag start, drag end, drag area),
// it's best to patch `updateAliveList` itself to also update the inputs!

const oldUpdateAliveList = `                    const updateAliveList = (start, end) => {
                        const s = Math.round(start);
                        const e = end !== undefined ? Math.round(end) : s;`;

const newUpdateAliveList = `                    const updateAliveList = (start, end) => {
                        const s = Math.round(start);
                        const e = end !== undefined ? Math.round(end) : s;
                        
                        const minInp = document.getElementById("timeline-chart-min-year");
                        const maxInp = document.getElementById("timeline-chart-max-year");
                        if (minInp && document.activeElement !== minInp) minInp.value = s;
                        if (maxInp && document.activeElement !== maxInp) maxInp.value = e;
                        
                        if (typeof checkInputs !== 'undefined') checkInputs();
`;

js = js.replace(oldUpdateAliveList, newUpdateAliveList);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js, 'utf8');
