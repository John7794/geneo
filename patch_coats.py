import re

with open('scripts/components/interaction/analyticsManager.js', 'r') as f:
    js = f.read()

old_coats = """        // Coats of arms
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
        }"""

new_coats = """        // Coats of arms
        const containerCoats = document.getElementById("analytics-coats");
        if (containerCoats && this.engine.db.coats) {
            const coatsMap = {};
            if (this.engine.db.names) {
                this.engine.db.names.forEach(n => {
                    const bCoat = n[COLUMNS.names?.bCoat || "b_coat_of_arms"];
                    const mCoat = n[COLUMNS.names?.mCoat || "m_coat_of_arms"];
                    const s = n[COLUMNS.names?.bSurname || "b_surname"] || "";
                    if (s && String(s).trim() !== "") {
                        const cleanS = normalizeSurname(String(s));
                        if (bCoat && String(bCoat).trim() !== "") {
                            if (!coatsMap[String(bCoat).trim()]) coatsMap[String(bCoat).trim()] = new Set();
                            coatsMap[String(bCoat).trim()].add(cleanS);
                        }
                        if (mCoat && String(mCoat).trim() !== "") {
                            if (!coatsMap[String(mCoat).trim()]) coatsMap[String(mCoat).trim()] = new Set();
                            coatsMap[String(mCoat).trim()].add(cleanS);
                        }
                    }
                });
            }
            const coatsData = [];
            this.engine.db.coats.forEach(c => {
                const name = c[COLUMNS.coats?.name || "coat_of_arms"];
                const url = c[COLUMNS.coats?.url || "coat_of_arms_url"];
                if (name && url) {
                    coatsData.push({name, url});
                }
            });
            containerCoats.innerHTML = coatsData.map(c => {
                const surnamesList = coatsMap[c.name] ? Array.from(coatsMap[c.name]) : [];
                const surnamesHtml = surnamesList.length > 0 ? `<span style="font-size: 11px; color: var(--color-text-muted);">${surnamesList.join(", ")}</span>` : "";
                return `
                <li style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 5px; background: var(--color-bg-sub); padding: 10px; border-radius: 8px;">
                    <img src="./data/media/${c.url}" alt="${c.name}" style="max-width: 100%; height: auto; max-height: 80px; object-fit: contain;">
                    <span style="font-size: 12px; font-weight: bold;">${c.name}</span>
                    ${surnamesHtml}
                </li>
            `}).join("");
        }"""

js = js.replace(old_coats, new_coats)

with open('scripts/components/interaction/analyticsManager.js', 'w') as f:
    f.write(js)
print("coats patched")
