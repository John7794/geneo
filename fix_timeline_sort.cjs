const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldSort = `                allTimelineEvents.sort((a, b) => {
                    const yA = a.gregorian.year || 0;
                    const yB = b.gregorian.year || 0;
                    const mA = a.gregorian.month || 0;
                    const mB = b.gregorian.month || 0;
                    const dA = a.gregorian.day || 0;
                    const dB = b.gregorian.day || 0;
                    
                    if (yA !== yB) return sortDesc ? yB - yA : yA - yB;
                    if (mA !== mB) return sortDesc ? mB - mA : mA - mB;
                    return sortDesc ? dB - dA : dA - dB;
                });`;

const newSort = `                const typeLabels = {
                    birth: i18n.t("events.birth") || "Народження",
                    baptism: i18n.t("events.baptism") || "Хрещення",
                    marriage: i18n.t("events.marriage") || "Шлюб",
                    death: i18n.t("events.death") || "Смерть",
                    funeral: i18n.t("events.funeral") || "Поховання"
                };

                allTimelineEvents.sort((a, b) => {
                    const yA = a.gregorian.year || 0;
                    const yB = b.gregorian.year || 0;
                    const mA = a.gregorian.month || 0;
                    const mB = b.gregorian.month || 0;
                    const dA = a.gregorian.day || 0;
                    const dB = b.gregorian.day || 0;
                    
                    if (yA !== yB) return sortDesc ? yB - yA : yA - yB;
                    if (mA !== mB) return sortDesc ? mB - mA : mA - mB;
                    if (dA !== dB) return sortDesc ? dB - dA : dA - dB;

                    // If same date (or just same year with no month/day)
                    const labelA = typeLabels[a.type] || a.type;
                    const labelB = typeLabels[b.type] || b.type;
                    
                    if (labelA !== labelB) {
                        return labelA.localeCompare(labelB);
                    }
                    
                    const nameA = a.person ? a.person.name || "" : "";
                    const nameB = b.person ? b.person.name || "" : "";
                    return nameA.localeCompare(nameB);
                });`;

code = code.replace(oldSort, newSort);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
