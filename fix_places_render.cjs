const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const countMarriageRegex = /if \(this\.engine\.db\.marriage\) \{\s*this\.engine\.db\.marriage\.forEach\(m => \{\s*const hid = m\[COLUMNS\.marriage\?\.husbandId \|\| "husband_id"\];\s*const wid = m\[COLUMNS\.marriage\?\.wifeId \|\| "wife_id"\];\s*if \(visibleIds && !visibleIds\.has\(String\(hid\)\) && !visibleIds\.has\(String\(wid\)\)\) return;\s*countPlace\(m\[COLUMNS\.marriage\?\.placeId \|\| "place_id"\], "шлюб"\);\s*\}\);\s*\}/s;

const newCountMarriage = `        if (this.engine.db.marriage) {
            this.engine.db.marriage.forEach(m => {
                const hid = m[COLUMNS.marriage?.husbandId || "husband_id"];
                const wid = m[COLUMNS.marriage?.wifeId || "wife_id"];
                if (visibleIds && !visibleIds.has(String(hid)) && !visibleIds.has(String(wid))) return;
                const placeId = m[COLUMNS.marriage?.placeId || "place_id"];
                if (hid && (!visibleIds || visibleIds.has(String(hid)))) countPlace(placeId, "шлюб", hid);
                if (wid && (!visibleIds || visibleIds.has(String(wid)))) countPlace(placeId, "шлюб", wid);
            });
        }`;
        
js = js.replace(countMarriageRegex, newCountMarriage);

const renderRegex = /this\.containerPlaces\.style\.flexDirection = "row";[\s\S]*?`\}\)\.join\(""\);/s;

const newRender = `this.containerPlaces.style.flexDirection = "column";

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
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
                    <span style="font-weight: 600; font-size: 15px;">\${placeName}</span>
                    <span style="background: var(--color-bg-body); padding: 2px 6px; border-radius: 12px; font-size: 12px; color: var(--color-text-muted);">\${total} \${getEventWord(total)}</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    \${Object.entries(eventsObj).map(e => \`
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-size: 13px; font-weight: 500; color: var(--color-primary);">\${e[0]} (\${e[1]})</span>
                            \${renderPeopleList(e[0])}
                        </div>
                    \`).join("")}
                </div>
            </li>
        \`}).join("");`;

js = js.replace(renderRegex, newRender);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
console.log("Updated Places Rendering");
