const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

js = js.replace(/const totalFamilies = this\.engine\.db\.familyList \? this\.engine\.db\.familyList\.length : 0;/,
`       let totalFamilies = 0;
        if (this.engine.db.familyList) {
            if (!visibleIds) {
                totalFamilies = this.engine.db.familyList.length;
            } else {
                this.engine.db.familyList.forEach(f => {
                    const hid = f[COLUMNS.family?.husbandId || "husband_id"];
                    const wid = f[COLUMNS.family?.wifeId || "wife_id"];
                    if (visibleIds.has(String(hid)) || visibleIds.has(String(wid))) {
                        totalFamilies++;
                    }
                });
            }
        }`);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
console.log("Families patched.");
