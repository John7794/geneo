const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const regex = /            if \(allEvents\.length === 0\) \{[\s\S]*?\}\);/m;

const newStr = `            if (allEvents.length === 0) {
                containerEvents.innerHTML = \`<li style="list-style: none; color: var(--color-text-muted); padding: 12px; text-align: center; background: var(--color-bg-card); border-radius: 8px;">Немає даних про події</li>\`;
            } else {
                let html = "";
                
                const getMonthName = (monthNum) => {
                    const months = i18n.t("time.monthsGenitive");
                    return Array.isArray(months) ? months[monthNum] || "" : "";
                };
                
                const typeLabels = {
                    birth: i18n.t("events.bornGroup") || "Народилися",
                    baptism: i18n.t("events.baptizedGroup") || "Охрещені",
                    marriage: i18n.t("events.marriedGroup") || "Одружилися",
                    death: i18n.t("events.diedGroup") || "Померли",
                    funeral: i18n.t("events.buriedGroup") || "Поховані"
                };
                
                // Group by Month -> Day -> Type -> List of events
                const grouped = {};
                allEvents.forEach(evt => {
                    const m = evt.gregorian.month;
                    const d = evt.gregorian.day;
                    const t = evt.type;
                    if (!grouped[m]) grouped[m] = {};
                    if (!grouped[m][d]) grouped[m][d] = {};
                    if (!grouped[m][d][t]) grouped[m][d][t] = [];
                    grouped[m][d][t].push(evt);
                });
                
                // Render
                const sortedMonths = Object.keys(grouped).map(Number).sort((a, b) => a - b);
                
                sortedMonths.forEach(m => {
                    const mName = i18n.t("time.monthsGenitive")[m];
                    html += \`
                        <li style="list-style: none; margin-top: 24px; margin-bottom: 12px; padding-bottom: 4px;">
                            <h3 style="margin: 0; font-size: 20px; text-transform: capitalize; color: var(--color-primary); border-bottom: 2px solid var(--color-border); padding-bottom: 8px;">\${mName}</h3>
                        </li>
                    \`;
                    
                    const sortedDays = Object.keys(grouped[m]).map(Number).sort((a, b) => a - b);
                    sortedDays.forEach(d => {
                        html += \`
                            <li style="list-style: none; margin-top: 16px; margin-bottom: 8px;">
                                <h4 style="margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text-main); background: var(--color-bg-sub); padding: 4px 12px; border-radius: 4px; display: inline-block;">\${d} \${getMonthName(m)}</h4>
                            </li>
                        \`;
                        
                        const types = Object.keys(grouped[m][d]);
                        // Define fixed order for types if needed, or just use what exists
                        const typeOrder = ['birth', 'baptism', 'marriage', 'death', 'funeral'];
                        types.sort((a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b));
                        
                        types.forEach(t => {
                            html += \`
                                <li style="list-style: none; margin-top: 8px; margin-bottom: 4px; margin-left: 12px;">
                                    <div style="font-size: 14px; font-weight: 600; color: var(--color-text-muted); margin-bottom: 4px;">\${typeLabels[t]}</div>
                                    <ul style="list-style: none; padding-left: 0; margin: 0; display: flex; flex-direction: column; gap: 4px;">
                            \`;
                            
                            grouped[m][d][t].forEach(evt => {
                                let p1Html = \`<a href="?id=\${encodeURIComponent(evt.person.id)}&view=profile" class="analytics-person-link js-stop-prop" data-pid="\${evt.person.id}" style="color: var(--color-primary); text-decoration: none;">\${escapeHtml(evt.person.name)}</a>\`;
                                let p2Html = "";
                                if (evt.type === "marriage" && evt.spouse) {
                                    p2Html = \` та <a href="?id=\${encodeURIComponent(evt.spouse.id)}&view=profile" class="analytics-person-link js-stop-prop" data-pid="\${evt.spouse.id}" style="color: var(--color-primary); text-decoration: none;">\${escapeHtml(evt.spouse.name)}</a>\`;
                                }
                                
                                let yearInfo = evt.year && !isNaN(evt.year) ? \`<span style="color: var(--color-text-muted); font-size: 13px; margin-left: 8px;">(\${evt.year} р.)</span>\` : '';
                                
                                html += \`
                                        <li style="display: flex; align-items: center; padding: 6px 12px; background: var(--color-bg-card); border: 1px solid var(--color-border-light); border-radius: 6px;">
                                            <div style="font-size: 15px; color: var(--color-text-main);">\${p1Html}\${p2Html}\${yearInfo}</div>
                                        </li>
                                \`;
                            });
                            
                            html += \`
                                    </ul>
                                </li>
                            \`;
                        });
                    });
                });
                
                containerEvents.innerHTML = html;
                
                // Add link behavior
                const links = containerEvents.querySelectorAll('.analytics-person-link');
                links.forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        const pid = e.target.getAttribute('data-pid') || e.currentTarget.getAttribute('data-pid');
                        if (pid && window.app && window.app.personPopupManager) {
                            window.app.personPopupManager.show(pid);
                        }
                    });
                });`;

if (regex.test(code)) {
    code = code.replace(regex, newStr);
    fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
    console.log("Success updating grouping");
} else {
    console.log("Target string not found");
}
