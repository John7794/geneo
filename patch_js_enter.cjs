const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldInput = `            if (minInput) minInput.addEventListener("input", checkInputs);
            if (maxInput) maxInput.addEventListener("input", checkInputs);`;

const newInput = `            if (minInput) minInput.addEventListener("input", checkInputs);
            if (maxInput) maxInput.addEventListener("input", checkInputs);
            
            const handleEnter = (e) => {
                if (e.key === 'Enter' && applyPeriodBtn && applyPeriodBtn.style.display !== 'none') {
                    applyPeriodBtn.click();
                    e.target.blur(); // Optionally remove focus
                }
            };
            if (minInput) minInput.addEventListener("keydown", handleEnter);
            if (maxInput) maxInput.addEventListener("keydown", handleEnter);`;

if (js.includes(oldInput)) {
    js = js.replace(oldInput, newInput);
    console.log("Patched enter key for apply");
} else {
    console.log("Could not find oldInput");
}
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js, 'utf8');
