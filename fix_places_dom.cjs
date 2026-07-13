const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

js = js.replace(
    'if (topPlaces.length === 0) this.containerPlaces.innerHTML = "<div style=\\"color:red;\\">No places found! (birth: " + (this.engine.db.birth?.length || 0) + ", visibleIds: " + (visibleIds ? visibleIds.size : "null") + ")</div>";\\n\\t\\telse this.containerPlaces.innerHTML = topPlaces.map(p => {',
    'this.containerPlaces.innerHTML = topPlaces.map(p => {'
);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
console.log("Reverted");
