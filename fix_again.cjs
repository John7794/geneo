const fs = require('fs');
let jsCode = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const targetStr = `                    renderPlaces(sortMode);
                });
            });
            renderPlaces(activeSort);
        }`;

if (jsCode.includes(targetStr)) {
    console.log("Found infinite loop target");
    // Remove the bad call
    jsCode = jsCode.replace(targetStr, `                    renderPlaces(sortMode);
                });
            });
        }`);
}

const callTarget = `        }
        
        // Causes of death`;

if (jsCode.includes(callTarget)) {
    console.log("Found injection point");
    jsCode = jsCode.replace(callTarget, `        }
        
        const currentSort = window.app?.managers?.analytics?.currentPlaceSort || 'alphabet_az';
        renderPlaces(currentSort);
        
        // Causes of death`);
}

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', jsCode);
