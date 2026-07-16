const fs = require('fs');
const file = 'scripts/components/interaction/analyticsManager.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `                                const getPersonPIB = (p) => {
                                    if (!p) return "Невідомо";
                                    let fullName = p.name || "";
                                    if (p.source === "basic" && p.raw) {
                                        const s = String(p.raw[COLUMNS.basic?.surname || "surname"] || "").trim();
                                        const n = String(p.raw[COLUMNS.basic?.name || "name"] || "").trim();
                                        const pat = String(p.raw[COLUMNS.basic?.patronymic || "patronymic"] || "").trim();
                                        fullName = [s, n, pat].filter(Boolean).join(" ");
                                    } else if (p.source === "family_list" && p.raw) {
                                        const s = String(p.raw[COLUMNS.familyList?.surname || "surname"] || "").trim();
                                        const n = String(p.raw[COLUMNS.familyList?.firstName || "first_name"] || "").trim();
                                        const pat = String(p.raw[COLUMNS.familyList?.patronymic || "patronymic"] || "").trim();
                                        fullName = [s, n, pat].filter(Boolean).join(" ");
                                    }
                                    return fullName;
                                };

                                let p1Html = \`<a href="?id=\${encodeURIComponent(evt.person.id)}&view=profile" class="analytics-person-link js-stop-prop" data-pid="\${evt.person.id}" style="color: var(--color-primary); text-decoration: none;">\${escapeHtml(getPersonPIB(evt.person))}</a>\`;
                                let p2Html = "";
                                if (evt.type === "marriage" && evt.spouse) {
                                    p2Html = \` та <a href="?id=\${encodeURIComponent(evt.spouse.id)}&view=profile" class="analytics-person-link js-stop-prop" data-pid="\${evt.spouse.id}" style="color: var(--color-primary); text-decoration: none;">\${escapeHtml(getPersonPIB(evt.spouse))}</a>\`;
                                }`;

const replacementStr = `                                const getPersonPIB = (p, eventType) => {
                                    if (!p) return "Невідомо";
                                    let s = "";
                                    let n = "";
                                    let pat = "";
                                    if (p.source === "basic" && p.raw) {
                                        s = String(p.raw[COLUMNS.basic?.surname || "surname"] || "").trim();
                                        n = String(p.raw[COLUMNS.basic?.name || "name"] || "").trim();
                                        pat = String(p.raw[COLUMNS.basic?.patronymic || "patronymic"] || "").trim();
                                    } else if (p.source === "family_list" && p.raw) {
                                        s = String(p.raw[COLUMNS.familyList?.surname || "surname"] || "").trim();
                                        n = String(p.raw[COLUMNS.familyList?.firstName || "first_name"] || "").trim();
                                        const patRaw = p.raw[COLUMNS.familyList?.patronymic || "patronymic"];
                                        pat = String(patRaw || "").trim();
                                    }

                                    const namesRow = this.engine?.db?.names?.find(r => String(r[COLUMNS.names?.personId || "person_id"]).trim() === String(p.id).trim());
                                    if (namesRow) {
                                        const bSurname = String(namesRow[COLUMNS.names?.bSurname || "b_surname"] || "").trim();
                                        const mSurname = String(namesRow[COLUMNS.names?.mSurname || "m_surname"] || "").trim();
                                        
                                        if (["birth", "baptism", "marriage"].includes(eventType)) {
                                            if (bSurname) s = bSurname;
                                        } else if (["death", "funeral"].includes(eventType)) {
                                            if (mSurname) {
                                                // Take the last married surname if multiple are provided (separated by comma)
                                                const mSurnames = mSurname.split(/[,;]/).map(x => x.trim()).filter(Boolean);
                                                if (mSurnames.length > 0) {
                                                    s = mSurnames[mSurnames.length - 1];
                                                }
                                            } else if (bSurname && p.gender === "f") {
                                                // If female and no mSurname, maybe she didn't marry, use bSurname. Or s is fine.
                                                s = bSurname;
                                            }
                                        }
                                    }

                                    let fullName = [s, n, pat].filter(Boolean).join(" ");
                                    return fullName || p.name || "";
                                };

                                let p1Html = \`<a href="?id=\${encodeURIComponent(evt.person.id)}&view=profile" class="analytics-person-link js-stop-prop" data-pid="\${evt.person.id}" style="color: var(--color-primary); text-decoration: none;">\${escapeHtml(getPersonPIB(evt.person, evt.type))}</a>\`;
                                let p2Html = "";
                                if (evt.type === "marriage" && evt.spouse) {
                                    p2Html = \` та <a href="?id=\${encodeURIComponent(evt.spouse.id)}&view=profile" class="analytics-person-link js-stop-prop" data-pid="\${evt.spouse.id}" style="color: var(--color-primary); text-decoration: none;">\${escapeHtml(getPersonPIB(evt.spouse, evt.type))}</a>\`;
                                }`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(file, content);
console.log('Surname patched!');
