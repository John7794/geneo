const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const timelineLogic = `
        // Timeline of events
        const containerTimeline = document.getElementById("analytics-timeline-list");
        if (containerTimeline) {
            const allTimelineEvents = [];
            
            const processEventsForTimeline = (sourceList, type, cols, idGetter) => {
                if (!sourceList || !Array.isArray(sourceList)) return;
                sourceList.forEach((record) => {
                    if (!record) return;
                    const idsRaw = idGetter(record);
                    if (!idsRaw) return;
                    const ids = Array.isArray(idsRaw) ? idsRaw.map((v) => (v ? String(v) : null)) : [String(idsRaw)];
                    
                    if (visibleIds && !ids.some((id) => id && visibleIds.has(id))) {
                        return;
                    }
                    
                    const d = parseInt(record[cols.day], 10);
                    const m = parseInt(record[cols.month], 10);
                    const yearVal = parseInt(record[cols.year], 10);
                    const isOldStyle = ["1", "true", "+"].includes(String(record[cols.calendar] || "").trim());
                    
                    if (isNaN(yearVal)) return; // Requires year for sorting
                    
                    let gregorian = { day: isNaN(d) ? null : d, month: isNaN(m) ? null : m, year: yearVal };
                    if (isOldStyle) {
                        const converted = convertJulianToGregorian(isNaN(d) ? 1 : d, isNaN(m) ? 1 : m, yearVal);
                        if (converted) gregorian = converted;
                    }
                    
                    const personId = ids[0];
                    const spouseId = ids[1];
                    const person = personId ? this.engine.getPerson(personId) : null;
                    const spouse = spouseId ? this.engine.getPerson(spouseId) : null;
                    
                    if (person) {
                        allTimelineEvents.push({
                            type,
                            year: yearVal,
                            gregorian,
                            original: { day: isNaN(d) ? null : d, month: isNaN(m) ? null : m, year: yearVal, isOldStyle },
                            person,
                            spouse,
                            recordType: String(record[cols.type] || "").trim()
                        });
                    }
                });
            };

            const DB = this.engine.db;
            if (DB) {
                processEventsForTimeline(DB.birth, "birth", COLUMNS.birth, (rec) => rec[COLUMNS.birth.personId]);
                processEventsForTimeline(DB.death, "death", COLUMNS.death, (rec) => rec[COLUMNS.death.personId]);
                processEventsForTimeline(DB.marriage, "marriage", COLUMNS.marriage, (rec) => [rec[COLUMNS.marriage.personId], rec[COLUMNS.marriage.spouseId]]);
                processEventsForTimeline(DB.baptism, "baptism", COLUMNS.baptism, (rec) => rec[COLUMNS.baptism.personId]);
                processEventsForTimeline(DB.funeral, "funeral", COLUMNS.funeral, (rec) => rec[COLUMNS.funeral.personId]);
            }
            
            // Deduplicate
            const groupedByTypeAndPerson = {};
            const uniqueEvents = [];
            allTimelineEvents.forEach(evt => {
                const key = evt.person.id + "_" + evt.type + (evt.spouse ? "_" + evt.spouse.id : "");
                if (!groupedByTypeAndPerson[key]) groupedByTypeAndPerson[key] = [];
                groupedByTypeAndPerson[key].push(evt);
            });
            
            Object.values(groupedByTypeAndPerson).forEach(group => {
                if (group.length === 1) {
                    uniqueEvents.push(group[0]);
                } else {
                    const actual = group.find(e => e.recordType.toLowerCase() === "фактично");
                    uniqueEvents.push(actual || group[0]);
                }
            });
            
            allTimelineEvents.length = 0;
            allTimelineEvents.push(...uniqueEvents);
            
            let sortDesc = true;
            let currentFilter = "all";
            
            const renderTimeline = () => {
                allTimelineEvents.sort((a, b) => {
                    const yA = a.gregorian.year || 0;
                    const yB = b.gregorian.year || 0;
                    const mA = a.gregorian.month || 0;
                    const mB = b.gregorian.month || 0;
                    const dA = a.gregorian.day || 0;
                    const dB = b.gregorian.day || 0;
                    
                    if (yA !== yB) return sortDesc ? yB - yA : yA - yB;
                    if (mA !== mB) return sortDesc ? mB - mA : mA - mB;
                    return sortDesc ? dB - dA : dA - dB;
                });
                
                let html = "";
                const filteredEvents = allTimelineEvents.filter(e => currentFilter === "all" || e.type === currentFilter);
                
                if (filteredEvents.length === 0) {
                    html = "<li style='padding: 16px; text-align: center; color: var(--color-text-muted);'>Немає подій для відображення</li>";
                } else {
                    const typeLabels = {
                        birth: i18n.t("events.birth") || "Народження",
                        baptism: "Хрещення",
                        marriage: i18n.t("events.marriage") || "Шлюб",
                        death: i18n.t("events.death") || "Смерть",
                        funeral: "Поховання"
                    };
                    const icons = {
                        birth: "ri-star-line",
                        baptism: "ri-drop-line",
                        marriage: "ri-hearts-line",
                        death: "ri-add-line",
                        funeral: "ri-home-4-line"
                    };
                    
                    const getMonthNameSafe = (monthNum) => {
                        const months = i18n.t("time.monthsGenitive");
                        return Array.isArray(months) ? months[monthNum] || "" : "";
                    };
                    
                    filteredEvents.forEach(evt => {
                        let dateStr = "";
                        const d = evt.gregorian.day;
                        const m = evt.gregorian.month;
                        const y = evt.gregorian.year;
                        
                        if (d) dateStr += escapeHtml(d) + " ";
                        if (m) dateStr += escapeHtml(getMonthNameSafe(m)) + " ";
                        if (y) dateStr += escapeHtml(y);
                        
                        if (evt.original.isOldStyle) {
                            let oldStr = "";
                            if (evt.original.day) oldStr += escapeHtml(evt.original.day) + " ";
                            if (evt.original.month) oldStr += escapeHtml(getMonthNameSafe(evt.original.month)) + " ";
                            oldStr += i18n.t("time.oldStyle") || "за ст. ст.";
                            dateStr += " <span class='event-date--old-style' style='color: var(--color-text-muted); font-size: 0.9em;'>(" + oldStr + ")</span>";
                        }
                        
                        const getPersonPIB = (p, eventType) => {
                            if (!p) return "Невідомо";
                            const details = findPersonDetails(p.id, window.app?.engine);
                            if (!details) return p.name || "Невідомо";
                            let s = details.surname || "";
                            let n = details.name || "";
                            let pat = details.patronymic || "";
                            
                            const isFem = details.gender === "f" || details.gender === "ж";
                            if (["birth", "baptism", "marriage"].includes(eventType)) {
                                if (isFem) s = details.maidenName ? details.maidenName : "";
                            } else if (["death", "funeral"].includes(eventType)) {
                                if (isFem) {
                                    if (details.marriedName) {
                                        const mSurnames = String(details.marriedName).split(/[,;]/).map(x => x.trim()).filter(Boolean);
                                        if (mSurnames.length > 0) s = mSurnames[mSurnames.length - 1];
                                        else s = details.maidenName ? details.maidenName : "";
                                    } else {
                                        s = details.maidenName ? details.maidenName : "";
                                    }
                                }
                            } else {
                                if (isFem) s = details.maidenName ? details.maidenName : "";
                            }
                            
                            const fullName = [s, n, pat].filter(Boolean).join(" ");
                            return fullName || p.name || "Невідомо";
                        };
                        
                        let namesStr = \`<a href="?id=\${encodeURIComponent(evt.person.id)}&view=profile" class="analytics-person-link js-stop-prop" data-pid="\${evt.person.id}" style="color: var(--color-primary); text-decoration: none; font-weight: 500;">\${escapeHtml(getPersonPIB(evt.person, evt.type))}</a>\`;
                        if (evt.type === "marriage" && evt.spouse) {
                            namesStr += \` та <a href="?id=\${encodeURIComponent(evt.spouse.id)}&view=profile" class="analytics-person-link js-stop-prop" data-pid="\${evt.spouse.id}" style="color: var(--color-primary); text-decoration: none; font-weight: 500;">\${escapeHtml(getPersonPIB(evt.spouse, evt.type))}</a>\`;
                        }
                        
                        html += \`
                            <li style="display: flex; gap: 16px; padding: 12px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 8px;">
                                <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--color-bg-hover); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 4px;">
                                    <i class="\${icons[evt.type] || 'ri-calendar-event-line'}" style="font-size: 20px; color: var(--color-text-main);"></i>
                                </div>
                                <div style="flex: 1; min-width: 0;">
                                    <div style="font-size: 13px; color: var(--color-text-muted); margin-bottom: 2px;">\${dateStr}</div>
                                    <div style="font-weight: 500; font-size: 15px; margin-bottom: 4px; color: var(--color-text-main);">\${typeLabels[evt.type] || evt.type}</div>
                                    <div style="font-size: 14px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">\${namesStr}</div>
                                </div>
                            </li>
                        \`;
                    });
                }
                containerTimeline.innerHTML = html;
                
                // Attach events to newly generated links
                containerTimeline.querySelectorAll('.analytics-person-link').forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        const pid = e.target.getAttribute('data-pid') || e.currentTarget.getAttribute('data-pid');
                        if (pid && window.app && window.app.navigateToId) {
                            window.app.navigateToId(pid, false, 'profile');
                        }
                    });
                });
            };
            
            renderTimeline();
            
            const btnSort = document.getElementById("timeline-sort-btn");
            if (btnSort) {
                btnSort.addEventListener("click", () => {
                    sortDesc = !sortDesc;
                    btnSort.innerHTML = sortDesc ? '<i class="ri-sort-desc"></i>' : '<i class="ri-sort-asc"></i>';
                    renderTimeline();
                });
            }
            
            const selectFilter = document.getElementById("timeline-filter-type");
            if (selectFilter) {
                selectFilter.addEventListener("change", (e) => {
                    currentFilter = e.target.value;
                    renderTimeline();
                });
            }
        }
`;

const insertIndex = code.indexOf("// Coats of arms");
if (insertIndex !== -1) {
    code = code.slice(0, insertIndex) + timelineLogic + "\n\n" + code.slice(insertIndex);
    fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
    console.log('Successfully patched analyticsManager.js');
} else {
    console.log('Failed to find insert index.');
}
