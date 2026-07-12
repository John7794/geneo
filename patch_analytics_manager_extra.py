import re

with open('scripts/components/interaction/analyticsManager.js', 'r') as f:
    js = f.read()

# Find the end of render where this.containerPlaces.innerHTML is set
old_places_render = """this.containerPlaces.innerHTML = topPlaces.map(p => {
            const total = p[1].total;
            const eventsObj = p[1].events;
            const eventsStr = Object.entries(eventsObj).map(e => `${e[1]} ${e[0]}`).join(', ');
            
            return `
            <li style="margin-bottom: 10px; display: flex; flex-direction: column; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px solid var(--color-border);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="font-weight: 500;">${placeNameMap[p[0]] || "Невідоме місце (" + p[0] + ")"}</span>
                    <span style="background: var(--color-bg-sub); padding: 2px 8px; border-radius: 12px; font-size: 0.85em; font-weight: bold;">${total} ${getEventWord(total)}</span>
                </div>
                <div style="font-size: 0.8em; color: var(--color-text-muted);">
                    (${eventsStr})
                </div>
            </li>
        `}).join("");"""

new_places_render = """this.containerPlaces.innerHTML = topPlaces.map(p => {
            const total = p[1].total;
            const eventsObj = p[1].events;
            const eventsStr = Object.entries(eventsObj).map(e => `${e[1]} ${e[0]}`).join(', ');
            
            return `
            <li style="margin-bottom: 10px; display: flex; flex-direction: column; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px solid var(--color-border);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="font-weight: 500;">${placeNameMap[p[0]] || "Невідоме місце (" + p[0] + ")"}</span>
                    <span style="background: var(--color-bg-sub); padding: 2px 8px; border-radius: 12px; font-size: 0.85em; font-weight: bold;">${total} ${getEventWord(total)}</span>
                </div>
                <div style="font-size: 0.8em; color: var(--color-text-muted);">
                    (${eventsStr})
                </div>
            </li>
        `}).join("");

        // Causes of death
        const containerDeaths = document.getElementById("analytics-deaths");
        if (containerDeaths && this.engine.db.death) {
            const deathsMap = {};
            this.engine.db.death.forEach(d => {
                let cause = d[COLUMNS.death?.cause || "d_cause"];
                if (cause && String(cause).trim() !== "") {
                    cause = String(cause).trim();
                    deathsMap[cause] = (deathsMap[cause] || 0) + 1;
                }
            });
            const topDeaths = Object.entries(deathsMap).sort((a, b) => b[1] - a[1]);
            containerDeaths.innerHTML = topDeaths.map(d => `
                <li style="margin-bottom: 5px; display: flex; justify-content: space-between;">
                    <span>${d[0]}</span>
                    <span style="color: var(--color-text-muted); font-size: 0.85em;">(${d[1]})</span>
                </li>
            `).join("");
        }

        // Religions
        const containerReligions = document.getElementById("analytics-religions");
        if (containerReligions && this.engine.db.identity) {
            const religionsMap = {};
            this.engine.db.identity.forEach(i => {
                let r = i[COLUMNS.identity?.belief || "belief"];
                if (r && String(r).trim() !== "") {
                    r = String(r).trim();
                    religionsMap[r] = (religionsMap[r] || 0) + 1;
                }
            });
            const topReligions = Object.entries(religionsMap).sort((a, b) => b[1] - a[1]);
            containerReligions.innerHTML = topReligions.map(r => `
                <li style="margin-bottom: 5px; display: flex; justify-content: space-between;">
                    <span>${r[0]}</span>
                    <span style="color: var(--color-text-muted); font-size: 0.85em;">(${r[1]})</span>
                </li>
            `).join("");
        }

        // Coats of arms
        const containerCoats = document.getElementById("analytics-coats");
        if (containerCoats && this.engine.db.coats) {
            const coatsData = [];
            this.engine.db.coats.forEach(c => {
                const name = c[COLUMNS.coats?.name || "coat_of_arms"];
                const url = c[COLUMNS.coats?.url || "coat_of_arms_url"];
                if (name && url) {
                    coatsData.push({name, url});
                }
            });
            containerCoats.innerHTML = coatsData.map(c => `
                <li style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 5px; background: var(--color-bg-sub); padding: 10px; border-radius: 8px;">
                    <img src="./data/media/${c.url}" alt="${c.name}" style="max-width: 100%; height: auto; max-height: 80px; object-fit: contain;">
                    <span style="font-size: 12px; font-weight: bold;">${c.name}</span>
                </li>
            `).join("");
        }
"""

js = js.replace(old_places_render, new_places_render)

with open('scripts/components/interaction/analyticsManager.js', 'w') as f:
    f.write(js)
print("js extra patches done")
