const fs = require('fs');
let jsCode = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');
const search = "renderPlaces(";
const lines = jsCode.split('\n');
for(let i=0; i<lines.length; i++){
    if(lines[i].includes(search)) {
        console.log(i, lines[i]);
    }
}
