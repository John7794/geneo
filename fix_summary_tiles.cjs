const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

// Find the HTML block to replace
const oldHtml = `                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; border-top: 4px solid var(--color-male);">
                        <div style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 8px;">Найпопулярніше ч. ім'я</div>
                        <div style="font-size: 18px; font-weight: 500; color: var(--color-text-main);">\${topM ? topM[0] : '-'}</div>
                        <div style="color: var(--color-text-meta); font-size: 12px; margin-top: 4px;">Зустрічається \${topM ? topM[1] : 0} разів</div>
                    </div>
                    
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; border-top: 4px solid var(--color-female);">
                        <div style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 8px;">Найпопулярніше ж. ім'я</div>
                        <div style="font-size: 18px; font-weight: 500; color: var(--color-text-main);">\${topF ? topF[0] : '-'}</div>
                        <div style="color: var(--color-text-meta); font-size: 12px; margin-top: 4px;">Зустрічається \${topF ? topF[1] : 0} разів</div>
                    </div>
                    
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; border-top: 4px solid var(--color-primary-light);">
                        <div style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 8px;">Найпоширеніше прізвище</div>
                        <div style="font-size: 18px; font-weight: 500; color: var(--color-text-main);">\${topS ? topS[0] : '-'}</div>
                        <div style="color: var(--color-text-meta); font-size: 12px; margin-top: 4px;">Зустрічається \${topS ? topS[1] : 0} разів</div>
                    </div>
                    
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; border-top: 4px solid var(--color-border);">
                        <div style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 8px;">Основний нас. пункт</div>
                        <div style="font-size: 16px; font-weight: 500; color: var(--color-text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\${topPlaceStr}</div>
                        <div style="color: var(--color-text-meta); font-size: 12px; margin-top: 4px;">Пов'язано \${topP ? topP[1].total : 0} подій</div>
                    </div>
                </div>`;

const newHtml = `                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; border-top: 4px solid var(--color-male);">
                        <div style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 8px;">Найпопулярніше ч. ім'я</div>
                        <div style="font-size: 18px; font-weight: 500; color: var(--color-text-main);">\${topM ? topM[0] : '-'}</div>
                        <div style="color: var(--color-text-meta); font-size: 12px; margin-top: 4px;">Зустрічається \${topM ? topM[1] : 0} разів</div>
                    </div>
                    
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; border-top: 4px solid var(--color-female);">
                        <div style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 8px;">Найпопулярніше ж. ім'я</div>
                        <div style="font-size: 18px; font-weight: 500; color: var(--color-text-main);">\${topF ? topF[0] : '-'}</div>
                        <div style="color: var(--color-text-meta); font-size: 12px; margin-top: 4px;">Зустрічається \${topF ? topF[1] : 0} разів</div>
                    </div>
                    
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; border-top: 4px solid var(--color-primary-light);">
                        <div style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 8px;">Найпоширеніше прізвище</div>
                        <div style="font-size: 18px; font-weight: 500; color: var(--color-text-main);">\${topS ? topS[0] : '-'}</div>
                        <div style="color: var(--color-text-meta); font-size: 12px; margin-top: 4px;">Зустрічається \${topS ? topS[1] : 0} разів</div>
                    </div>
                    
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; border-top: 4px solid var(--color-border);">
                        <div style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 8px;">Основний нас. пункт</div>
                        <div style="font-size: 16px; font-weight: 500; color: var(--color-text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\${topPlaceStr}</div>
                        <div style="color: var(--color-text-meta); font-size: 12px; margin-top: 4px;">Пов'язано \${topP ? topP[1].total : 0} подій</div>
                    </div>
                    
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; border-top: 4px solid var(--color-border);">
                        <div style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 8px;">Найчастіша причина смерті</div>
                        <div style="font-size: 16px; font-weight: 500; color: var(--color-text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\${topDeathStr}</div>
                        <div style="color: var(--color-text-meta); font-size: 12px; margin-top: 4px;">Зустрічається \${topDeathCount} разів</div>
                    </div>
                    
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; border-top: 4px solid var(--color-border);">
                        <div style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 8px;">Найпоширеніший герб</div>
                        <div style="font-size: 16px; font-weight: 500; color: var(--color-text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\${topCoatStr}</div>
                        <div style="color: var(--color-text-meta); font-size: 12px; margin-top: 4px;">\${topCoatCount > 0 ? "Зустрічається " + topCoatCount + " разів" : "-"}</div>
                    </div>
                </div>`;

// Find where to compute topDeathStr and topCoatStr
const oldLogic = `            // Resolve place
            let topPlaceStr = "Немає даних";
            if (topP) {
                topPlaceStr = placeNameMap[topP[0]] || topP[0];
            }`;

const newLogic = `            // Resolve place
            let topPlaceStr = "Немає даних";
            if (topP) {
                topPlaceStr = placeNameMap[topP[0]] || topP[0];
            }
            
            // Resolve death
            let topDeathStr = "Немає даних";
            let topDeathCount = 0;
            if (this.engine.db.death) {
                const deathsMap = {};
                this.engine.db.death.forEach(d => {
                    let cause = d[COLUMNS.death?.cause || "d_cause"];
                    if (cause && String(cause).trim() !== "") {
                        cause = String(cause).trim();
                        deathsMap[cause] = (deathsMap[cause] || 0) + 1;
                    }
                });
                const topD = Object.entries(deathsMap).sort((a,b) => b[1] - a[1])[0];
                if (topD) {
                    topDeathStr = topD[0];
                    topDeathCount = topD[1];
                }
            }
            
            // Resolve coat
            let topCoatStr = "Немає даних";
            let topCoatCount = 0;
            if (this.engine.db.coats && this.engine.db.names) {
                const coatsMap = {};
                this.engine.db.names.forEach(n => {
                    const bCoat = n[COLUMNS.names?.bCoat || "b_coat_of_arms"];
                    const mCoat = n[COLUMNS.names?.mCoat || "m_coat_of_arms"];
                    if (bCoat && String(bCoat).trim() !== "") {
                        coatsMap[String(bCoat).trim()] = (coatsMap[String(bCoat).trim()] || 0) + 1;
                    }
                    if (mCoat && String(mCoat).trim() !== "") {
                        coatsMap[String(mCoat).trim()] = (coatsMap[String(mCoat).trim()] || 0) + 1;
                    }
                });
                const topC = Object.entries(coatsMap).sort((a,b) => b[1] - a[1])[0];
                if (topC) {
                    topCoatStr = topC[0];
                    topCoatCount = topC[1];
                }
            }`;

if (js.includes(oldHtml) && js.includes(oldLogic)) {
    js = js.replace(oldLogic, newLogic);
    js = js.replace(oldHtml, newHtml);
    fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
    console.log("Tiles added.");
} else {
    console.log("Could not find the blocks to replace!");
}
