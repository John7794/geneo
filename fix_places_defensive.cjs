const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const regexDef = /const countPlace = \(placeId, eventType, pid\) => \{/s;
const newDef = `
        const getBOMSafeValue = (obj, colName) => {
            if (!obj) return undefined;
            if (obj[colName] !== undefined) return obj[colName];
            const key = Object.keys(obj).find(k => k.trim().replace(/^\\uFEFF/, '') === colName);
            if (key) return obj[key];
            return undefined;
        };

        const countPlace = (placeId, eventType, pid) => {`;
        
js = js.replace(regexDef, newDef);

// Replace usages for birth, death, marriage, baptism, funeral

const regexBirth = /countPlace\(b\[COLUMNS\.birth\?\.placeId \|\| "place_id"\], "народження", pid\);/s;
js = js.replace(regexBirth, `countPlace(getBOMSafeValue(b, COLUMNS.birth?.placeId || "place_id"), "народження", pid);`);

const regexDeath = /countPlace\(d\[COLUMNS\.death\?\.placeId \|\| "place_id"\], "смерть", pid\);/s;
js = js.replace(regexDeath, `countPlace(getBOMSafeValue(d, COLUMNS.death?.placeId || "place_id"), "смерть", pid);`);

const regexBaptism = /countPlace\(m\[COLUMNS\.baptism\?\.placeId \|\| "place_id"\], "хрещення"\);/s;
js = js.replace(regexBaptism, `countPlace(getBOMSafeValue(m, COLUMNS.baptism?.placeId || "place_id"), "хрещення", pid);`);

const regexFuneral = /countPlace\(m\[COLUMNS\.funeral\?\.placeId \|\| "place_id"\], "поховання"\);/s;
js = js.replace(regexFuneral, `countPlace(getBOMSafeValue(m, COLUMNS.funeral?.placeId || "place_id"), "поховання", pid);`);

const regexMarriage = /const placeId = m\[COLUMNS\.marriage\?\.placeId \|\| "place_id"\];/s;
js = js.replace(regexMarriage, `const placeId = getBOMSafeValue(m, COLUMNS.marriage?.placeId || "place_id");`);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
console.log("Defensive places extraction added");
