const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

// 1. Insert visibleIds logic
let insertPoint = `this.initAccordions();`;
let insertContent = `this.initAccordions();

        let visibleIds = null;
        if (window.app && window.app.lineageManager && window.app.lineageManager.logic) {
            const mode = window.app.lineageManager.logic.mode;
            if (mode && mode !== "all") {
                visibleIds = new Set(window.app.lineageManager.logic.queue);
            }
        }`;
js = js.replace(insertPoint, insertContent);

// 2. Patch birthMap
js = js.replace(/this\.engine\.db\.birth\.forEach\(b => \{/, `this.engine.db.birth.forEach(b => {
				const pid = b[COLUMNS.birth?.personId || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;`);

// 3. Patch deathMap
js = js.replace(/this\.engine\.db\.death\.forEach\(d => \{/, `this.engine.db.death.forEach(d => {
				const pid = d[COLUMNS.death?.personId || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;`);

// 4. Patch countPlace calls
js = js.replace(/if \(this\.engine\.db\.birth\) \{\s*this\.engine\.db\.birth\.forEach\(b => countPlace\(b\[COLUMNS\.birth\?\.[a-zA-Z]+ \|\| "place_id"\], "народження"\)\);\s*\}/, 
`if (this.engine.db.birth) {
            this.engine.db.birth.forEach(b => {
                const pid = b[COLUMNS.birth?.personId || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;
                countPlace(b[COLUMNS.birth?.placeId || "place_id"], "народження");
            });
        }`);

js = js.replace(/if \(this\.engine\.db\.death\) \{\s*this\.engine\.db\.death\.forEach\(d => countPlace\(d\[COLUMNS\.death\?\.[a-zA-Z]+ \|\| "place_id"\], "смерть"\)\);\s*\}/, 
`if (this.engine.db.death) {
            this.engine.db.death.forEach(d => {
                const pid = d[COLUMNS.death?.personId || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;
                countPlace(d[COLUMNS.death?.placeId || "place_id"], "смерть");
            });
        }`);

js = js.replace(/if \(this\.engine\.db\.marriage\) \{\s*this\.engine\.db\.marriage\.forEach\(m => countPlace\(m\[COLUMNS\.marriage\?\.[a-zA-Z]+ \|\| "place_id"\], "шлюб"\)\);\s*\}/, 
`if (this.engine.db.marriage) {
            this.engine.db.marriage.forEach(m => {
                const hid = m[COLUMNS.marriage?.husbandId || "husband_id"];
                const wid = m[COLUMNS.marriage?.wifeId || "wife_id"];
                if (visibleIds && !visibleIds.has(String(hid)) && !visibleIds.has(String(wid))) return;
                countPlace(m[COLUMNS.marriage?.placeId || "place_id"], "шлюб");
            });
        }`);

js = js.replace(/if \(this\.engine\.db\.baptism\) \{\s*this\.engine\.db\.baptism\.forEach\(m => countPlace\(m\[COLUMNS\.baptism\?\.[a-zA-Z]+ \|\| "place_id"\], "хрещення"\)\);\s*\}/, 
`if (this.engine.db.baptism) {
            this.engine.db.baptism.forEach(m => {
                const pid = m[COLUMNS.baptism?.personId || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;
                countPlace(m[COLUMNS.baptism?.placeId || "place_id"], "хрещення");
            });
        }`);

js = js.replace(/if \(this\.engine\.db\.funeral\) \{\s*this\.engine\.db\.funeral\.forEach\(m => countPlace\(m\[COLUMNS\.funeral\?\.[a-zA-Z]+ \|\| "place_id"\], "поховання"\)\);\s*\}/, 
`if (this.engine.db.funeral) {
            this.engine.db.funeral.forEach(m => {
                const pid = m[COLUMNS.funeral?.personId || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;
                countPlace(m[COLUMNS.funeral?.placeId || "place_id"], "поховання");
            });
        }`);

// 5. Patch db.basic (surnames & names)
js = js.replace(/this\.engine\.db\.basic\.forEach\(b => \{/, 
`this.engine.db.basic.forEach(b => {
                const pid = b[COLUMNS.basic?.id || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;`);

// 6. Patch db.names
js = js.replace(/this\.engine\.db\.names\.forEach\(n => \{/, 
`this.engine.db.names.forEach(n => {
                const pid = n[COLUMNS.names?.personId || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;`);

// 7. Patch this.engine.people
js = js.replace(/this\.engine\.people\.forEach\(\(person, id\) => \{/, 
`this.engine.people.forEach((person, id) => {
            if (visibleIds && !visibleIds.has(String(id))) return;`);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
console.log("Analytics patched.");
