import re

with open('scripts/components/interaction/analyticsManager.js', 'r') as f:
    js = f.read()

# 1. Import renderPersonTile
if "import { renderPersonTile }" not in js:
    js = js.replace('import { resolveCoatUrl } from "../../utils/coatUtils.js";', 'import { resolveCoatUrl } from "../../utils/coatUtils.js";\nimport { renderPersonTile } from "../ui/shared/personTile.js";')

# 2. Total people calculation & male/female counting
old_counts = """		const totalPeople = this.engine.people.size;
		const totalFamilies = this.engine.db.familyList ? this.engine.db.familyList.length : 0;
		let maleCount = 0;
		let femaleCount = 0;
		let unknownCount = 0;"""

new_counts = """		let maleCount = 0;
		let femaleCount = 0;
		let unknownCount = 0;
		let totalPeople = 0;
		const totalFamilies = this.engine.db.familyList ? this.engine.db.familyList.length : 0;"""

js = js.replace(old_counts, new_counts)

old_loop = """		this.engine.people.forEach((person, id) => {
			if (person.gender === "m" || person.gender === "ч") maleCount++;
			else if (person.gender === "f" || person.gender === "ж") femaleCount++;
			else unknownCount++;"""

new_loop = """		this.engine.people.forEach((person, id) => {
		    if (person.source === "basic") {
		        totalPeople++;
			    if (person.gender === "m" || person.gender === "ч") maleCount++;
			    else if (person.gender === "f" || person.gender === "ж") femaleCount++;
			    else unknownCount++;
			}"""

js = js.replace(old_loop, new_loop)

# 3. Lifespan block: maxObj formatting
old_lifespan_max = """				if (maxObj.id) html += `<br>Найдовше: <a href="#" class="analytics-link" data-id="${maxObj.id}">${maxObj.name}</a> (${maxObj.age} років)`;"""
new_lifespan_max = """				if (maxObj.id) {
				    const maxPerson = this.engine.getPerson(maxObj.id);
				    if (maxPerson) html += `<br><div style="margin-top:5px; margin-bottom:5px; font-weight:500;">Найдовше (${maxObj.age} років):</div> ${renderPersonTile(maxPerson, {}, "", false)}`;
				}"""
js = js.replace(old_lifespan_max, new_lifespan_max)

old_lifespan_min = """				if (minObj.id) html += `<br>Найменше: <a href="#" class="analytics-link" data-id="${minObj.id}">${minObj.name}</a> (${minObj.age} років)`;"""
new_lifespan_min = """				if (minObj.id) {
				    const minPerson = this.engine.getPerson(minObj.id);
				    if (minPerson) html += `<br><div style="margin-top:5px; margin-bottom:5px; font-weight:500;">Найменше (${minObj.age} років):</div> ${renderPersonTile(minPerson, {}, "", false)}`;
				}"""
js = js.replace(old_lifespan_min, new_lifespan_min)

# 4. Places events formatting
old_places_html = """                if (placesEventsMap[s[0]]) {
                    const eList = Object.entries(placesEventsMap[s[0]]).sort((a,b) => b[1] - a[1]);
                    html += `<div class="analytics-place-events">(${eList.map(e => `${e[1]} ${e[0]}`).join(", ")})</div>`;
                }
                html += `</div>`;"""

new_places_html = """                if (placesEventsMap[s[0]]) {
                    const eList = Object.entries(placesEventsMap[s[0]]).sort((a,b) => b[1] - a[1]);
                    html += `<ul class="analytics-sublist" style="margin-top:8px;">` + eList.map(e => `<li class="analytics-sublist-item" style="border-left:none; padding-left:0;"><span>${e[0]}</span> <span class="analytics-list-count">${e[1]}</span></li>`).join("") + `</ul>`;
                }
                html += `</div>`;"""
js = js.replace(old_places_html, new_places_html)

# Unknown count visibility logic in general stats
old_general_html = """			<div class="analytics-stat-card">
				<div class="analytics-general-value">${maleCount} / ${femaleCount}${unknownCount > 0 ? ' / ' + unknownCount : ''}</div>
				<div class="analytics-stat-label">Чоловіків / Жінок${unknownCount > 0 ? ' / Невідомо' : ''}</div>
			</div>"""

new_general_html = """			<div class="analytics-stat-card">
				<div class="analytics-general-value">${maleCount} / ${femaleCount}${unknownCount > 0 ? ' / ' + unknownCount : ''}</div>
				<div class="analytics-stat-label">Чоловіків / Жінок${unknownCount > 0 ? ' / Невідомо' : ''}</div>
			</div>"""

with open('scripts/components/interaction/analyticsManager.js', 'w') as f:
    f.write(js)
print("AnalyticsManager JS patched")
