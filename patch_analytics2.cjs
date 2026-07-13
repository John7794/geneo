const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

js = js.replace(`const pid = b[COLUMNS.birth?.personId || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;
				const pid = b[COLUMNS.birth?.personId || "person_id"];`,
`const pid = b[COLUMNS.birth?.personId || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;`);

js = js.replace(`const pid = d[COLUMNS.death?.personId || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;
				const pid = d[COLUMNS.death?.personId || "person_id"];`,
`const pid = d[COLUMNS.death?.personId || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;`);

js = js.replace(`const pid = b[COLUMNS.basic?.id || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;
                const s = b[COLUMNS.basic?.surname || "surname"];`,
`const pid = b[COLUMNS.basic?.id || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;
                const s = b[COLUMNS.basic?.surname || "surname"];`);
// actually the basic table replacement was:
// this.engine.db.basic.forEach(b => {
//                 const pid = b[COLUMNS.basic?.id || "person_id"];
//                 if (visibleIds && !visibleIds.has(String(pid))) return;

js = js.replace(`const pid = n[COLUMNS.names?.personId || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;
                const nns = n[COLUMNS.names?.bNobleNicknames || "b_noble_nicknames"];`,
`const pid = n[COLUMNS.names?.personId || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;
                const nns = n[COLUMNS.names?.bNobleNicknames || "b_noble_nicknames"];`);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
console.log("Analytics patched 2.");
