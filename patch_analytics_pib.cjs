const fs = require('fs');
const file = 'scripts/components/interaction/analyticsManager.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('findPersonDetails')) {
    content = content.replace('import { escapeHtml }', 'import { findPersonDetails } from "../../utils/personUtils.js";\nimport { escapeHtml }');
}

// Replace getPersonName
const getPersonNameRegex = /const getPersonName = \(pid\) => \{[\s\S]*?return `<a href="\?id=\$\{encodeURIComponent\(pid\)\}&view=profile" class="js-stop-prop analytics-person-link" style="color: var\(--color-primary\); text-decoration: none;">\$\{escapeHtml\(fullName\)\}<\/a>`;\n\s*\};/;
const newGetPersonName = `const getPersonName = (pid, eventType) => {
            if (!pid) return "Невідомо";
            const details = findPersonDetails(pid, this.engine);
            if (!details || (!details.name && !details.surname)) return "Невідомо";
            
            let s = details.surname || "";
            let n = details.name || "";
            let pat = details.patronymic || "";
            
            const isFem = details.gender === "f" || details.gender === "ж";
            if (["birth", "baptism", "marriage", "народження", "хрещення", "шлюб"].includes(eventType)) {
                if (details.maidenName) s = details.maidenName;
            } else if (["death", "funeral", "смерть", "поховання"].includes(eventType)) {
                if (details.marriedName) {
                    const mSurnames = String(details.marriedName).split(/[,;]/).map(x => x.trim()).filter(Boolean);
                    if (mSurnames.length > 0) s = mSurnames[mSurnames.length - 1];
                } else if (isFem && details.maidenName) {
                    s = details.maidenName;
                }
            } else {
                if (isFem && details.maidenName) {
                    s = details.maidenName;
                }
            }
            
            const fullName = [s, n, pat].filter(Boolean).join(" ");
            return \`<a href="?id=\${encodeURIComponent(pid)}&view=profile" class="js-stop-prop analytics-person-link" style="color: var(--color-primary); text-decoration: none;">\${escapeHtml(fullName)}</a>\`;
        };`;
content = content.replace(getPersonNameRegex, newGetPersonName);

// Update calls to getPersonName to pass eventType
content = content.replace(/countPlace\(b\[COLUMNS\.birth\?\.placeId \|\| "place_id"\], "народження", \[getPersonName\(pid\)\], \[pid\]\);/g, 'countPlace(b[COLUMNS.birth?.placeId || "place_id"], "народження", [getPersonName(pid, "народження")], [pid]);');
content = content.replace(/countPlace\(d\[COLUMNS\.death\?\.placeId \|\| "place_id"\], "смерть", \[getPersonName\(pid\)\], \[pid\]\);/g, 'countPlace(d[COLUMNS.death?.placeId || "place_id"], "смерть", [getPersonName(pid, "смерть")], [pid]);');
content = content.replace(/const hName = getPersonName\(hid\);/g, 'const hName = getPersonName(hid, "шлюб");');
content = content.replace(/const wName = getPersonName\(wid\);/g, 'const wName = getPersonName(wid, "шлюб");');
content = content.replace(/countPlace\(m\[COLUMNS\.baptism\?\.placeId \|\| "place_id"\], "хрещення", \[getPersonName\(pid\)\], \[pid\]\);/g, 'countPlace(m[COLUMNS.baptism?.placeId || "place_id"], "хрещення", [getPersonName(pid, "хрещення")], [pid]);');
content = content.replace(/countPlace\(m\[COLUMNS\.funeral\?\.placeId \|\| "place_id"\], "поховання", \[getPersonName\(pid\)\], \[pid\]\);/g, 'countPlace(m[COLUMNS.funeral?.placeId || "place_id"], "поховання", [getPersonName(pid, "поховання")], [pid]);');

// Replace getPersonPIB logic
const getPersonPIBRegex = /const getPersonPIB = \(p, eventType\) => \{[\s\S]*?return fullName \|\| p\.name \|\| "";\n\s*\};/;
const newGetPersonPIB = `const getPersonPIB = (p, eventType) => {
                                    if (!p) return "Невідомо";
                                    const details = findPersonDetails(p.id, window.app?.engine);
                                    let s = details.surname || "";
                                    let n = details.name || "";
                                    let pat = details.patronymic || "";
                                    
                                    const isFem = details.gender === "f" || details.gender === "ж";
                                    if (["birth", "baptism", "marriage"].includes(eventType)) {
                                        if (details.maidenName) s = details.maidenName;
                                    } else if (["death", "funeral"].includes(eventType)) {
                                        if (details.marriedName) {
                                            const mSurnames = String(details.marriedName).split(/[,;]/).map(x => x.trim()).filter(Boolean);
                                            if (mSurnames.length > 0) s = mSurnames[mSurnames.length - 1];
                                        } else if (isFem && details.maidenName) {
                                            s = details.maidenName;
                                        }
                                    } else {
                                        if (isFem && details.maidenName) {
                                            s = details.maidenName;
                                        }
                                    }
                                    
                                    const fullName = [s, n, pat].filter(Boolean).join(" ");
                                    return fullName || p.name || "Невідомо";
                                };`;
content = content.replace(getPersonPIBRegex, newGetPersonPIB);

fs.writeFileSync(file, content);
console.log('Patched analyticsManager.js');
