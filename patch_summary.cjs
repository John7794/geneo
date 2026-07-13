const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldHtmlBlock = `                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
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

const newHtmlBlock = `                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                    <a href="#" class="analytics-nav-btn" data-target="analytics-names-m" data-title="Чоловічі імена" style="display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 20px 16px; color: var(--color-text-main); text-decoration: none; font-size: 16px; font-weight: 500; transition: all 0.2s; border-top: 4px solid var(--color-male);">
                        <i class="ri-men-line" style="font-size: 20px; color: var(--color-male);"></i> Чоловічі імена
                    </a>
                    
                    <a href="#" class="analytics-nav-btn" data-target="analytics-names-f" data-title="Жіночі імена" style="display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 20px 16px; color: var(--color-text-main); text-decoration: none; font-size: 16px; font-weight: 500; transition: all 0.2s; border-top: 4px solid var(--color-female);">
                        <i class="ri-women-line" style="font-size: 20px; color: var(--color-female);"></i> Жіночі імена
                    </a>
                    
                    <a href="#" class="analytics-nav-btn" data-target="analytics-surnames" data-title="Прізвища" style="display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 20px 16px; color: var(--color-text-main); text-decoration: none; font-size: 16px; font-weight: 500; transition: all 0.2s; border-top: 4px solid var(--color-primary-light);">
                        <i class="ri-group-line" style="font-size: 20px; color: var(--color-primary-light);"></i> Прізвища
                    </a>
                    
                    <a href="#" class="analytics-nav-btn" data-target="analytics-places" data-title="Населені пункти" style="display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 20px 16px; color: var(--color-text-main); text-decoration: none; font-size: 16px; font-weight: 500; transition: all 0.2s; border-top: 4px solid var(--color-border);">
                        <i class="ri-map-pin-2-line" style="font-size: 20px; color: var(--color-text-muted);"></i> Населені пункти
                    </a>
                    
                    <a href="#" class="analytics-nav-btn" data-target="analytics-deaths" data-title="Причини смерті" style="display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 20px 16px; color: var(--color-text-main); text-decoration: none; font-size: 16px; font-weight: 500; transition: all 0.2s; border-top: 4px solid var(--color-border);">
                        <i class="ri-skull-2-line" style="font-size: 20px; color: var(--color-text-muted);"></i> Причини смерті
                    </a>
                    
                    <a href="#" class="analytics-nav-btn" data-target="analytics-coats" data-title="Герби" style="display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 20px 16px; color: var(--color-text-main); text-decoration: none; font-size: 16px; font-weight: 500; transition: all 0.2s; border-top: 4px solid var(--color-border);">
                        <i class="ri-shield-line" style="font-size: 20px; color: var(--color-text-muted);"></i> Герби
                    </a>
                </div>`;

if(js.includes("Найпопулярніше ч. ім'я")) {
    js = js.replace(oldHtmlBlock, newHtmlBlock);
    fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
    console.log("Success");
} else {
    console.log("String not found");
}
