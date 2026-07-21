const fs = require('fs');
const jsCode = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');
const lines = jsCode.split('\n');
let braceCount = 0;
let foundStart = false;
for(let i=0; i<lines.length; i++){
    if(lines[i].includes('const renderPlaces = (sortMode) => {')) {
        foundStart = true;
    }
    if (foundStart) {
        braceCount += (lines[i].match(/\{/g) || []).length;
        braceCount -= (lines[i].match(/\}/g) || []).length;
        if (braceCount === 0) {
            console.log("Ends at line:", i + 1);
            break;
        }
    }
}
