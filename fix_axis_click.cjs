const fs = require('fs');

let content = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const injection = `
                    const axis = document.getElementById('analytics-timeline-axis');
                    if (axis) {
                        axis.addEventListener('click', (e) => {
                            const rect = innerChart.getBoundingClientRect();
                            let x = e.clientX - rect.left;
                            if (x < 0) x = 0;
                            if (x > totalWidth) x = totalWidth;
                            
                            if (scrubber) scrubber.style.left = \`\${x}px\`;
                            if (scrubberHandle) {
                                scrubberHandle.style.left = \`\${x}px\`;
                                const currentYear = pxToYear(x);
                                scrubberHandle.textContent = Math.round(currentYear);
                                updateAliveList(currentYear);
                            }
                        });
                    }
                    
                    if (scrubber) {`;

content = content.replace('if (scrubber) {', injection);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', content);
