import re

with open('scripts/components/interaction/analyticsManager.js', 'r') as f:
    js = f.read()

# Fix coats inline style
js = js.replace("""<span style="font-size: 11px; color: var(--color-text-muted);">${surnamesList.join(", ")}</span>""", """<span class="analytics-coat-surnames">${surnamesList.join(", ")}</span>""")

# Update normalizeSurname
old_normalize_surname = """        const normalizeSurname = (surname) => {
            let s = surname.replace(/[\?0-9]/g, '').trim();
            if (s.endsWith("ська")) return s.slice(0, -4) + "ський";
            if (s.endsWith("цька")) return s.slice(0, -4) + "цький";
            if (s.endsWith("зька")) return s.slice(0, -4) + "зький";
            return s;
        };"""

new_normalize_surname = """        const normalizeSurname = (surname, gender) => {
            let s = surname.replace(/[\?0-9]/g, '').trim();
            if (s.endsWith("ська")) return s.slice(0, -4) + "ський";
            if (s.endsWith("цька")) return s.slice(0, -4) + "цький";
            if (s.endsWith("зька")) return s.slice(0, -4) + "зький";
            if (gender === 'f' || gender === 'ж') {
                if (s.endsWith("ова")) return s.slice(0, -3) + "ов";
                if (s.endsWith("єва")) return s.slice(0, -3) + "єв";
                if (s.endsWith("ева")) return s.slice(0, -3) + "ев";
                if (s.endsWith("іна")) return s.slice(0, -3) + "ін";
                if (s.endsWith("їна")) return s.slice(0, -3) + "їн";
                if (s.endsWith("ина")) return s.slice(0, -3) + "ин";
                if (s.endsWith("ая")) return s.slice(0, -2) + "ий";
                if (s.endsWith("яя")) return s.slice(0, -2) + "ій";
            }
            return s;
        };"""

js = js.replace(old_normalize_surname, new_normalize_surname)

# Update the calls to normalizeSurname
old_call_1 = """const cleanS = normalizeSurname(String(s));"""
new_call_1 = """const cleanS = normalizeSurname(String(s), g);"""
# We must replace it carefully. Let's do it using regex to match the loop contexts.
# 1. In this.engine.db.basic.forEach
js = re.sub(
    r'(const cleanS = normalizeSurname\(String\(s\)\);)(\s*if \(cleanS\) {)',
    r'const cleanS = normalizeSurname(String(s), g);\2',
    js
)

# 2. In this.engine.db.names.forEach (nicknames)
old_nicknames_loop = """        if (this.engine.db.names) {
            this.engine.db.names.forEach(n => {
                const nns = n[COLUMNS.names?.bNobleNicknames || "b_noble_nicknames"];
                const s = n[COLUMNS.names?.bSurname || "b_surname"];
                if (s && String(s).trim() !== "" && nns && String(nns).trim() !== "") {
                    const cleanS = normalizeSurname(String(s));"""

new_nicknames_loop = """        if (this.engine.db.names) {
            this.engine.db.names.forEach(n => {
                const nns = n[COLUMNS.names?.bNobleNicknames || "b_noble_nicknames"];
                const s = n[COLUMNS.names?.bSurname || "b_surname"];
                if (s && String(s).trim() !== "" && nns && String(nns).trim() !== "") {
                    let g = "u";
                    const pid = n[COLUMNS.names?.personId || "person_id"];
                    if (pid) {
                        const person = this.engine.getPerson(pid);
                        if (person) g = person.gender;
                    }
                    const cleanS = normalizeSurname(String(s), g);"""
                    
js = js.replace(old_nicknames_loop, new_nicknames_loop)

# 3. In Coats loop
old_coats_loop = """            if (this.engine.db.names) {
                this.engine.db.names.forEach(n => {
                    const bCoat = n[COLUMNS.names?.bCoat || "b_coat_of_arms"];
                    const mCoat = n[COLUMNS.names?.mCoat || "m_coat_of_arms"];
                    const s = n[COLUMNS.names?.bSurname || "b_surname"] || "";
                    if (s && String(s).trim() !== "") {
                        const cleanS = normalizeSurname(String(s));"""

new_coats_loop = """            if (this.engine.db.names) {
                this.engine.db.names.forEach(n => {
                    const bCoat = n[COLUMNS.names?.bCoat || "b_coat_of_arms"];
                    const mCoat = n[COLUMNS.names?.mCoat || "m_coat_of_arms"];
                    const s = n[COLUMNS.names?.bSurname || "b_surname"] || "";
                    if (s && String(s).trim() !== "") {
                        let g = "u";
                        const pid = n[COLUMNS.names?.personId || "person_id"];
                        if (pid) {
                            const person = this.engine.getPerson(pid);
                            if (person) g = person.gender;
                        }
                        const cleanS = normalizeSurname(String(s), g);"""
                        
js = js.replace(old_coats_loop, new_coats_loop)

# In the render function for makesLink, there's also inline styles: 
# return `<span class="analytics-stat-value">${obj.age}</span><br><span style="font-size: 0.65em; color: var(--color-text-muted);">(<a href="#" onclick="event.preventDefault(); if(window.app && window.app.navigateToId) { window.app.navigateToId('${obj.id}', false, 'profile');  }" style="color: var(--color-text-muted); text-decoration: underline;">${shortName}</a>)</span>`;
js = js.replace("""<span style="font-size: 0.65em; color: var(--color-text-muted);">""", """<span class="analytics-stat-label">""")
js = js.replace("""style="color: var(--color-text-muted); text-decoration: underline;" """, """class="analytics-stat-label" style="text-decoration: underline;" """)

with open('scripts/components/interaction/analyticsManager.js', 'w') as f:
    f.write(js)
print("Surnames and links patched")
