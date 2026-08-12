const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldMouseUp = `                    const onScrubberMouseUp = () => {
                        if (draggedHandle) {
                            draggedHandle = null;
                            document.body.style.userSelect = '';
                            updateTimelineUrl();
                        }
                    };`;

const newMouseUp = `                    const onScrubberMouseUp = () => {
                        if (draggedHandle) {
                            draggedHandle = null;
                            document.body.style.userSelect = '';
                            
                            if (scrubberMode === "period" && scrubberStartYear > scrubberEndYear) {
                                const temp = scrubberStartYear;
                                scrubberStartYear = scrubberEndYear;
                                scrubberEndYear = temp;
                            }
                            
                            updateTimelineUrl();
                        }
                    };`;

if (js.includes(oldMouseUp)) {
    js = js.replace(oldMouseUp, newMouseUp);
    console.log("Patched mouseUp");
} else {
    console.log("Could not find oldMouseUp");
}
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js, 'utf8');
