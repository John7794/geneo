const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const regexMap = /const placeNameMap = \{\};\s*console\.log\("places rows:", this\.engine\?\.db\?\.places\?\.length\); const placeNameMap = \{\};\s*if \(this\.engine && this\.engine\.db && this\.engine\.db\.places\) \{\s*this\.engine\.db\.places\.forEach\(p => \{\s*const idCol = COLUMNS\.places\?\.id \|\| "place_id";\s*const nameCol = COLUMNS\.places\?\.nameCurrent \|\| "name_current";\s*const histCol = COLUMNS\.places\?\.nameHist \|\| "name_hist";\s*placeNameMap\[p\[idCol\]\] = p\[nameCol\] \|\| p\[histCol\] \|\| "Невідомо";\s*\}\);\s*\}/s;

const newMap = `
        const placeNameMap = {};
        if (this.engine && this.engine.db && this.engine.db.places) {
            this.engine.db.places.forEach(p => {
                const idCol = COLUMNS.places?.id || "place_id";
                const nameCol = COLUMNS.places?.nameCurrent || "name_current";
                const histCol = COLUMNS.places?.nameHist || "name_hist";
                if (p[idCol]) {
                    placeNameMap[String(p[idCol]).trim()] = p[nameCol] || p[histCol] || "Невідомо";
                }
            });
        }
`;

js = js.replace(/console\.log\("places rows:.*?; const placeNameMap = \{\};/, 'const placeNameMap = {};');

const regexCountPlace = /const countPlace = \(placeId, eventType\) => \{\s*if \(placeId && String\(placeId\)\.trim\(\) !== ""\) \{\s*if \(!placesCount\[placeId\]\) placesCount\[placeId\] = \{ total: 0, events: \{\} \};\s*placesCount\[placeId\]\.total\+\+;\s*placesCount\[placeId\]\.events\[eventType\] = \(placesCount\[placeId\]\.events\[eventType\] \|\| 0\) \+ 1;\s*\}\s*\};/s;

const newCountPlace = `
        const countPlace = (placeId, eventType, pid) => {
            const cleanId = placeId ? String(placeId).trim() : "";
            if (cleanId !== "") {
                if (!placesCount[cleanId]) placesCount[cleanId] = { total: 0, events: {}, people: {} };
                placesCount[cleanId].total++;
                placesCount[cleanId].events[eventType] = (placesCount[cleanId].events[eventType] || 0) + 1;
                
                if (pid) {
                    if (!placesCount[cleanId].people[eventType]) placesCount[cleanId].people[eventType] = new Set();
                    placesCount[cleanId].people[eventType].add(pid);
                }
            }
        };
`;

js = js.replace(regexCountPlace, newCountPlace);

js = js.replace(/countPlace\(b\[COLUMNS\.birth\?\.placeId \|\| "place_id"\], "народження"\);/g, 'countPlace(b[COLUMNS.birth?.placeId || "place_id"], "народження", pid);');
js = js.replace(/countPlace\(d\[COLUMNS\.death\?\.placeId \|\| "place_id"\], "смерть"\);/g, 'countPlace(d[COLUMNS.death?.placeId || "place_id"], "смерть", pid);');
js = js.replace(/countPlace\(m\[COLUMNS\.marriage\?\.place \|\| "place"\], "шлюб"\);/g, 'countPlace(m[COLUMNS.marriage?.place || "place"], "шлюб", hid); countPlace(m[COLUMNS.marriage?.place || "place"], "шлюб", wid);');
js = js.replace(/countPlace\(b\[COLUMNS\.baptism\?\.placeId \|\| "place_id"\], "хрещення"\);/g, 'countPlace(b[COLUMNS.baptism?.placeId || "place_id"], "хрещення", pid);');
js = js.replace(/countPlace\(f\[COLUMNS\.funeral\?\.placeId \|\| "place_id"\], "поховання"\);/g, 'countPlace(f[COLUMNS.funeral?.placeId || "place_id"], "поховання", pid);');

const regexRenderPlaces = /this\.containerPlaces\.innerHTML = topPlaces\.map\(p => \{\s*const total = p\[1\]\.total;\s*const eventsObj = p\[1\]\.events;\s*return `\s*<li style="list-style: none; display: inline-flex; flex-direction: column; background: var\(--color-bg-card\); border: 1px solid var\(--color-border-light\); border-radius: 8px; padding: 4px 12px; font-size: 14px; color: var\(--color-text-main\);">\s*<div style="display: flex; align-items: center; gap: 6px;">\s*<span>\$\{placeNameMap\[p\[0\]\] \|\| "Невідоме місце \(" \+ p\[0\] \+ "\)"\}<\/span>\s*<span style="background: var\(--color-bg-body\); padding: 2px 6px; border-radius: 12px; font-size: 12px; color: var\(--color-text-muted\);">\$\{total\} \$\{getEventWord\(total\)\}<\/span>\s*<\/div>\s*<div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; padding-top: 6px; border-top: 1px dashed var\(--color-border-light\);">\s*\$\{Object\.entries\(eventsObj\)\.map\(e => `<span style="font-size: 12px; color: var\(--color-text-muted\);">\$\{e\[0\]\} \(\$\{e\[1\]\}\)<\/span>`\)\.join\(""\)\}\s*<\/div>\s*<\/li>\s*`\}\)\.join\(""\);/s;

const newRenderPlaces = `
        this.containerPlaces.style.flexDirection = "column";
        this.containerPlaces.style.gap = "16px";
        
        this.containerPlaces.innerHTML = topPlaces.map(p => {
            const placeId = p[0];
            const placeName = placeNameMap[placeId] || "Невідоме місце (" + placeId + ")";
            const total = p[1].total;
            const eventsObj = p[1].events;
            const peopleObj = p[1].people;
            
            const renderPeopleList = (eventType) => {
                if (!peopleObj[eventType] || peopleObj[eventType].size === 0) return "";
                const pids = Array.from(peopleObj[eventType]);
                const peopleNames = pids.map(pid => {
                    const person = this.engine.getPerson(pid);
                    if (!person) return null;
                    return person.fullName || person.basic?.name || "Невідомо";
                }).filter(Boolean);
                
                if (peopleNames.length === 0) return "";
                return \`<div style="font-size: 12px; color: var(--color-text-main); margin-top: 4px; padding-left: 8px; border-left: 2px solid var(--color-border-light);">
                    \${peopleNames.join(', ')}
                </div>\`;
            };
            
            return \`
            <li style="list-style: none; display: flex; flex-direction: column; background: var(--color-bg-card); border: 1px solid var(--color-border-light); border-radius: 8px; padding: 12px; font-size: 14px; color: var(--color-text-main);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <span style="font-weight: 600; font-size: 15px;">\${placeName}</span>
                    <span style="background: var(--color-bg-body); padding: 2px 6px; border-radius: 12px; font-size: 12px; color: var(--color-text-muted);">\${total} \${getEventWord(total)}</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">
                    \${Object.entries(eventsObj).map(e => \`
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-size: 13px; font-weight: 500; color: var(--color-text-meta);">\${e[0]} (\${e[1]}):</span>
                            \${renderPeopleList(e[0])}
                        </div>
                    \`).join("")}
                </div>
            </li>
        \`}).join("");
`;

if (js.includes('this.containerPlaces.innerHTML = topPlaces.map(p => {') && js.includes('const getEventWord = (count) => {')) {
    js = js.replace(regexRenderPlaces, newRenderPlaces);
    
    // Also fix placeNameMap setup (remove old duplicate if it's there)
    js = js.replace(/const placeNameMap = \{\};\s*if \(this\.engine && this\.engine\.db && this\.engine\.db\.places\) \{\s*this\.engine\.db\.places\.forEach\(p => \{\s*const idCol = COLUMNS\.places\?\.id \|\| "place_id";\s*const nameCol = COLUMNS\.places\?\.nameCurrent \|\| "name_current";\s*const histCol = COLUMNS\.places\?\.nameHist \|\| "name_hist";\s*placeNameMap\[p\[idCol\]\] = p\[nameCol\] \|\| p\[histCol\] \|\| "Невідомо";\s*\}\);\s*\}/s, newMap);

    fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
    console.log("Success update places");
} else {
    console.log("Places regex not matched");
}
