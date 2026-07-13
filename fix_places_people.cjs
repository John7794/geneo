const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const regexRenderList = /const renderPeopleList = \(eventType\) => \{[\s\S]*?return `<div style="font-size: 12px;/s;

const newRenderList = `const renderPeopleList = (eventType) => {
                if (!peopleObj[eventType] || peopleObj[eventType].size === 0) return "";
                const pids = Array.from(peopleObj[eventType]);
                const peopleNames = pids.map(pid => {
                    const person = this.engine.getPerson(pid);
                    if (!person) return "Невідомо (" + pid + ")";
                    
                    let s = "";
                    let n = "";
                    if (person.basic) {
                        s = person.basic[COLUMNS.basic?.surname || "surname"] || person.surname || "";
                        n = person.basic[COLUMNS.basic?.name || "name"] || person.name || "";
                    } else {
                        s = person.surname || "";
                        n = person.name || "";
                    }
                    s = String(s).trim();
                    n = String(n).trim();
                    const name = [s, n].filter(Boolean).join(" ");
                    return name || person.fullName || "Невідомо";
                }).filter(Boolean);
                
                if (peopleNames.length === 0) return "";
                return \`<div style="font-size: 12px;`;

js = js.replace(regexRenderList, newRenderList);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
console.log("Updated Places People Rendering");
