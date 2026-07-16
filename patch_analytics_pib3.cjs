const fs = require('fs');
const file = 'scripts/components/interaction/analyticsManager.js';
let content = fs.readFileSync(file, 'utf8');

const getPersonNameRegex = /const getPersonName = \(pid, eventType\) => \{[\s\S]*?const fullName = \[s, n, pat\].filter\(Boolean\).join\(" "\);/g;

const newGetPersonName = `const getPersonName = (pid, eventType) => {
            if (!pid) return "Невідомо";
            const details = findPersonDetails(pid, this.engine);
            if (!details || (!details.name && !details.surname)) return "Невідомо";
            
            let s = details.surname || "";
            let n = details.name || "";
            let pat = details.patronymic || "";
            
            const isFem = details.gender === "f" || details.gender === "ж";
            if (["birth", "baptism", "marriage", "народження", "хрещення", "шлюб"].includes(eventType)) {
                if (isFem) {
                    s = details.maidenName ? details.maidenName : "";
                }
            } else if (["death", "funeral", "смерть", "поховання"].includes(eventType)) {
                if (isFem) {
                    if (details.marriedName) {
                        const mSurnames = String(details.marriedName).split(/[,;]/).map(x => x.trim()).filter(Boolean);
                        if (mSurnames.length > 0) {
                            s = mSurnames[mSurnames.length - 1];
                        } else {
                            s = details.maidenName ? details.maidenName : "";
                        }
                    } else {
                        s = details.maidenName ? details.maidenName : "";
                    }
                }
            } else {
                if (isFem) {
                    s = details.maidenName ? details.maidenName : "";
                }
            }
            
            const fullName = [s, n, pat].filter(Boolean).join(" ");`;

content = content.replace(getPersonNameRegex, newGetPersonName);

const getPersonPIBRegex = /const getPersonPIB = \(p, eventType\) => \{[\s\S]*?const fullName = \[s, n, pat\].filter\(Boolean\).join\(" "\);/g;

const newGetPersonPIB = `const getPersonPIB = (p, eventType) => {
                                    if (!p) return "Невідомо";
                                    const details = findPersonDetails(p.id, window.app?.engine);
                                    let s = details.surname || "";
                                    let n = details.name || "";
                                    let pat = details.patronymic || "";
                                    
                                    const isFem = details.gender === "f" || details.gender === "ж";
                                    if (["birth", "baptism", "marriage"].includes(eventType)) {
                                        if (isFem) {
                                            s = details.maidenName ? details.maidenName : "";
                                        }
                                    } else if (["death", "funeral"].includes(eventType)) {
                                        if (isFem) {
                                            if (details.marriedName) {
                                                const mSurnames = String(details.marriedName).split(/[,;]/).map(x => x.trim()).filter(Boolean);
                                                if (mSurnames.length > 0) {
                                                    s = mSurnames[mSurnames.length - 1];
                                                } else {
                                                    s = details.maidenName ? details.maidenName : "";
                                                }
                                            } else {
                                                s = details.maidenName ? details.maidenName : "";
                                            }
                                        }
                                    } else {
                                        if (isFem) {
                                            s = details.maidenName ? details.maidenName : "";
                                        }
                                    }
                                    
                                    const fullName = [s, n, pat].filter(Boolean).join(" ");`;

content = content.replace(getPersonPIBRegex, newGetPersonPIB);

fs.writeFileSync(file, content);
console.log('Patched analyticsManager.js');
