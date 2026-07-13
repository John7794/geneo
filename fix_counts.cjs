const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const regex = /renderSortableList\(this\.containerNamesM,\s*namesMCount,\s*namesMOrder,\s*true\);\s*renderSortableList\(this\.containerNamesF,\s*namesFCount,\s*namesFOrder,\s*true\);\s*renderSortableList\(document\.getElementById\("analytics-surnames-list"\),\s*surnamesCount,\s*surnamesOrder\);/s;

const replacement = `
        renderSortableList(this.containerNamesM, namesM, namesMOrder, true);
        renderSortableList(this.containerNamesF, namesF, namesFOrder, true);
        renderSortableList(document.getElementById("analytics-surnames-list"), surnamesMap, surnamesOrder);

        const uniqueNamesMCount = Object.keys(namesM).length;
        const uniqueNamesFCount = Object.keys(namesF).length;
        const uniqueSurnamesCount = Object.keys(surnamesMap).length;
        const uniquePlacesCount = Object.keys(placesCount).length;
        
        let coatsDataCount = 0;
        let deathsMapCount = 0;
        
        try {
            const coatsSet = new Set();
            if (this.engine && this.engine.db && this.engine.db.names) {
                this.engine.db.names.forEach(n => {
                    const coat = n[COLUMNS.names?.coatOfArms || "coat_of_arms"];
                    if (coat && String(coat).trim() !== "") {
                        coatsSet.add(String(coat).trim());
                    }
                });
            }
            coatsDataCount = coatsSet.size;
        } catch(e) {}
        
        try {
            const deathsSet = new Set();
            if (this.engine && this.engine.db && this.engine.db.death) {
                this.engine.db.death.forEach(d => {
                    const cause = d[COLUMNS.death?.cause || "cause"];
                    if (cause && String(cause).trim() !== "") {
                        deathsSet.add(String(cause).trim().toLowerCase());
                    }
                });
            }
            deathsMapCount = deathsSet.size;
        } catch(e) {}

        const uniqueDeathsCount = deathsMapCount;
        const uniqueCoatsCount = coatsDataCount;
`;

if (regex.test(js)) {
    js = js.replace(regex, replacement);
    fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
    console.log("Success fix counts");
} else {
    console.log("Counts not found");
}
