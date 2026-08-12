const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldEnd = `                        chartContainer.addEventListener('mouseleave', () => {
                            isDraggingCanvas = false;
                            chartContainer.style.cursor = '';
                        });
                    }
                }
            };`;

const newEnd = `                        chartContainer.addEventListener('mouseleave', () => {
                            isDraggingCanvas = false;
                            chartContainer.style.cursor = '';
                        });
                    }
                }
                
                setTimeout(() => {
                    if (chartContainer && typeof chartContainer.scrollTo === 'function') {
                        const hStart = document.getElementById("timeline-scrubber-handle-start") || document.getElementById("timeline-scrubber-handle");
                        const hEnd = document.getElementById("timeline-scrubber-handle-end") || hStart;
                        if (hStart && hEnd) {
                            const left1 = parseFloat(hStart.style.left) || 0;
                            const left2 = parseFloat(hEnd.style.left) || left1;
                            const centerPx = (left1 + left2) / 2;
                            chartContainer.scrollTo({
                                left: Math.max(0, centerPx - chartContainer.clientWidth / 2),
                                behavior: 'smooth'
                            });
                        }
                    }
                }, 100);
            };`;

if (js.includes(oldEnd)) {
    js = js.replace(oldEnd, newEnd);
    console.log("Patched auto scroll");
} else {
    console.log("Could not find oldEnd");
}
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js, 'utf8');
