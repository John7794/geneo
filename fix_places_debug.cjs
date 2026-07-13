const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

js = js.replace(
    'const topPlaces = Object.entries(placesCount).sort((a, b) => b[1].total - a[1].total);',
    'const topPlaces = Object.entries(placesCount).sort((a, b) => b[1].total - a[1].total); console.log("topPlaces length:", topPlaces.length);'
);

js = js.replace(
    'this.containerPlaces.innerHTML = topPlaces.map(p => {',
    'console.log("Rendering places..."); this.containerPlaces.innerHTML = topPlaces.map(p => {'
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
console.log("Added debug");
