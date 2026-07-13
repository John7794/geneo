const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const regexMap = /const placeNameMap = \{\};\s*if \(this\.engine && this\.engine\.db && this\.engine\.db\.places\) \{\s*this\.engine\.db\.places\.forEach\(p => \{[\s\S]*?\}\);\s*\}/s;

const newMap = `
        const placeNameMap = {};
        if (this.engine && this.engine.db && this.engine.db.places) {
            this.engine.db.places.forEach(p => {
                const idCol = COLUMNS.places?.id || "place_id";
                const nameCol = COLUMNS.places?.nameCurrent || "name_current";
                const histCol = COLUMNS.places?.nameHist || "name_hist";
                
                // BOM safe lookup
                let actualId = p[idCol];
                if (actualId === undefined) {
                    const key = Object.keys(p).find(k => k.trim().replace(/^\\uFEFF/, '') === idCol);
                    if (key) actualId = p[key];
                }
                
                if (actualId) {
                    placeNameMap[String(actualId).trim()] = p[nameCol] || p[histCol] || "Невідомо";
                }
            });
        }
`;

js = js.replace(regexMap, newMap);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
console.log("Fixed BOM in analyticsManager");
