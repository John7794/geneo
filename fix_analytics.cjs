const fs = require('fs');
let js = fs.readFileSync('analyticsManager_backup.js', 'utf8');

const regexToReplace = /container\.innerHTML = sortedEntries\.map\(s => \{\s*let hasNicknames = includeNicknames && nicknamesMap\[s\[0\]\];\s*let html = \`.*this\.containerSummary\.innerHTML = html;/s;

const correctCode = `container.innerHTML = sortedEntries.map(s => {
                    let hasNicknames = includeNicknames && nicknamesMap[s[0]];
                    return \`
                        <li style="list-style: none; display: inline-flex; flex-direction: column; background: var(--color-bg-card); border: 1px solid var(--color-border-light); border-radius: 8px; padding: 4px 12px; font-size: 14px; color: var(--color-text-main);">
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <span>\${s[0]}</span>
                                <span style="background: var(--color-bg-body); padding: 2px 6px; border-radius: 12px; font-size: 12px; color: var(--color-text-muted);">\${s[1]}</span>
                            </div>
                            \${hasNicknames ? \`<div style="font-size: 12px; color: var(--color-text-muted); margin-top: 4px; padding-top: 4px; border-top: 1px dashed var(--color-border-light);">\${Array.from(nicknamesMap[s[0]]).join(', ')}</div>\` : ''}
                        </li>
                    \`;
                }).join("");
            };
            
            renderData('frequency');
            
            const btnSortFreq = container.parentElement.querySelector('.btn-sort-freq');
            const btnSortAlpha = container.parentElement.querySelector('.btn-sort-alpha');
            const btnSortApp = container.parentElement.querySelector('.btn-sort-app');
            
            if (btnSortFreq) {
                 btnSortFreq.onclick = (e) => { e.preventDefault(); renderData('frequency'); };
            }
            if (btnSortAlpha) {
                 btnSortAlpha.onclick = (e) => { e.preventDefault(); renderData('alphabet'); };
            }
            if (btnSortApp) {
                 btnSortApp.onclick = (e) => { e.preventDefault(); renderData('appearance'); };
            }
        };

        renderSortableList(this.containerNamesM, namesMCount, namesMOrder, true);
        renderSortableList(this.containerNamesF, namesFCount, namesFOrder, true);
        renderSortableList(document.getElementById("analytics-surnames-list"), surnamesCount, surnamesOrder);

        let html = \`
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px;">
                    <!-- Загальна кількість -->
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px; display: flex; flex-direction: column;">
                        <div style="color: var(--color-text-muted); font-size: 14px; margin-bottom: 12px;">Загальна кількість</div>
                        <div style="font-size: 32px; font-weight: bold; color: var(--color-primary); margin-bottom: 8px;">\${totalPeople}</div>
                        <div style="color: var(--color-text-meta); font-size: 14px; margin-top: auto;">Чоловіків: \${maleCount} / Жінок: \${femaleCount}</div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
                    <a href="#" class="analytics-nav-btn" data-target="analytics-lifespan" data-title="Тривалість життя" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px 16px; color: var(--color-text-main); text-decoration: none; transition: all 0.2s;">
                        <div style="font-size: 18px; font-weight: 600; text-align: center;">Тривалість життя</div>
                        <div style="font-size: 13px; color: var(--color-text-meta);">макс: \${confStats.max > 0 ? confStats.max : approxStats.max} р.</div>
                    </a>

                    <a href="#" class="analytics-nav-btn" data-target="analytics-names" data-title="Імена" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px 16px; color: var(--color-text-main); text-decoration: none; transition: all 0.2s;">
                        <div style="font-size: 18px; font-weight: 600;">Імена</div>
                        <div style="font-size: 13px; color: var(--color-text-meta);">унікальних: \${uniqueNamesMCount + uniqueNamesFCount}</div>
                    </a>
                    
                    <a href="#" class="analytics-nav-btn" data-target="analytics-surnames" data-title="Прізвища" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px 16px; color: var(--color-text-main); text-decoration: none; transition: all 0.2s;">
                        <div style="font-size: 18px; font-weight: 600;">Прізвища</div>
                        <div style="font-size: 13px; color: var(--color-text-meta);">унікальних: \${uniqueSurnamesCount}</div>
                    </a>
                    
                    <a href="#" class="analytics-nav-btn" data-target="analytics-places" data-title="Населені пункти" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px 16px; color: var(--color-text-main); text-decoration: none; transition: all 0.2s;">
                        <div style="font-size: 18px; font-weight: 600; text-align: center;">Населені пункти</div>
                        <div style="font-size: 13px; color: var(--color-text-meta);">унікальних: \${uniquePlacesCount}</div>
                    </a>
                    
                    <a href="#" class="analytics-nav-btn" data-target="analytics-deaths" data-title="Причини смерті" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px 16px; color: var(--color-text-main); text-decoration: none; transition: all 0.2s;">
                        <div style="font-size: 18px; font-weight: 600; text-align: center;">Причини смерті</div>
                        <div style="font-size: 13px; color: var(--color-text-meta);">унікальних: \${uniqueDeathsCount}</div>
                    </a>

                    <a href="#" class="analytics-nav-btn" data-target="analytics-events" data-title="Календар подій" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px 16px; color: var(--color-text-main); text-decoration: none; transition: all 0.2s;">
                        <div style="font-size: 18px; font-weight: 600; text-align: center;">Календар подій</div>
                        <div style="font-size: 13px; color: var(--color-text-meta);">події</div>
                    </a>
                    
                    <a href="#" class="analytics-nav-btn" data-target="analytics-coats" data-title="Герби" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px 16px; color: var(--color-text-main); text-decoration: none; transition: all 0.2s;">
                        <div style="font-size: 18px; font-weight: 600;">Герби</div>
                        <div style="font-size: 13px; color: var(--color-text-meta);">унікальних: \${uniqueCoatsCount}</div>
                    </a>
                </div>
            \`;
            this.containerSummary.innerHTML = html;`;

if (!regexToReplace.test(js)) {
    console.log("Regex did not match.");
    process.exit(1);
}

js = js.replace(regexToReplace, correctCode);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
console.log("Success fix");
