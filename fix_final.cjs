const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

// The problematic code:
/*
                let tocCenturies = new Set();
                let html = "";
                const filteredEvents = allTimelineEvents.filter(e => currentFilter === "all" || e.type === currentFilter);
                
                if (filteredEvents.length === 0) {
                    html = "<li style='padding: 16px; text-align: center; color: var(--color-text-muted);'>Немає подій для відображення</li>";
                } else {

                    const icons = {
                        ...
                    };
                    
                    const getMonthNameSafe = ...
                    
                    const getCenturyRoman = (c) => {
                        const romanNumerals = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI", "XXII", "XXIII", "XXIV", "XXV"];
                        return romanNumerals[c] || c;
                    };
                    
                    let currentCentury = null;
*/

// Let's replace the whole section starting from "const renderTimeline = () => {"
const pattern = /const renderTimeline = \(\) => \{[\s\S]*?let currentCentury = null;/;

const newContent = `const renderTimeline = () => {
                const typeLabels = {
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

                    const labelA = typeLabels[a.type] || a.type;
                    const labelB = typeLabels[b.type] || b.type;
                    
                    if (labelA !== labelB) {
                        return labelA.localeCompare(labelB);
                    }
                    
                    const nameA = a.person ? a.person.name || "" : "";
                    const nameB = b.person ? b.person.name || "" : "";
                    return nameA.localeCompare(nameB);
                });
                
                const getCenturyRoman = (c) => {
                    const romanNumerals = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI", "XXII", "XXIII", "XXIV", "XXV"];
                    return romanNumerals[c] || c;
                };
                
                let tocCenturies = new Set();
                let html = "";
                const filteredEvents = allTimelineEvents.filter(e => currentFilter === "all" || e.type === currentFilter);
                
                if (filteredEvents.length === 0) {
                    html = "<li style='padding: 16px; text-align: center; color: var(--color-text-muted);'>Немає подій для відображення</li>";
                } else {

                    const icons = {
                        birth: "ri-star-line",
                        baptism: "ri-drop-line",
                        marriage: "ri-hearts-line",
                        death: "ri-add-line",
                        funeral: "ri-archive-line"
                    };
                    
                    const getMonthNameSafe = (monthNum, isNominative = false) => {
                        const key = isNominative ? "time.monthsNominative" : "time.monthsGenitive";
                        const months = i18n.t(key);
                        return Array.isArray(months) ? months[monthNum] || "" : "";
                    };

                    let currentCentury = null;`;

code = code.replace(pattern, newContent);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
