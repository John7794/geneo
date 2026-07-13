const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

// First remove the old placeNameMap block
const blockToRemove = `        // Resolve place names
        const placesDb = this.engine.db.places || [];
        const placeNameMap = {};
        placesDb.forEach(p => {
            placeNameMap[p[COLUMNS.places?.id || "place_id"]] = p[COLUMNS.places?.nameCurrent || "name_current"] || p[COLUMNS.places?.nameHist || "name_hist"] || "Невідомо";
        });`;

if (js.includes(blockToRemove)) {
    js = js.replace(blockToRemove, '');
    
    // Now insert it before Generate Summary Dashboard
    js = js.replace('// Generate Summary Dashboard', blockToRemove + '\n\n        // Generate Summary Dashboard');
    fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
    console.log("Fixed placeNameMap.");
} else {
    console.log("Could not find blockToRemove!");
}
