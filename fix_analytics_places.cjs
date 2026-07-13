const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');
js = js.replace('this.containerPlaces = document.getElementById("analytics-places");', '');
js = js.replace('// New summary logic', 'this.containerPlaces = document.getElementById("analytics-places");\n\t\t// New summary logic');
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
console.log("Fixed containerPlaces.");
