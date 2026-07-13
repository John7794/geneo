const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

let constructorLogic = `
		this.containerPlaces = document.getElementById("analytics-places");
		
		// New summary logic
		this.containerSummary = document.getElementById("analytics-summary");
		this.btnToggleDetails = document.getElementById("btn-toggle-analytics-details");
		this.detailedView = document.getElementById("analytics-detailed-view");
		if (this.btnToggleDetails) {
		    this.btnToggleDetails.addEventListener("click", () => {
		        if (this.detailedView.style.display === "none") {
		            this.detailedView.style.display = "flex";
		            this.btnToggleDetails.innerHTML = 'Сховати деталі <i class="ri-arrow-up-s-line" style="margin-left: 8px;"></i>';
		        } else {
		            this.detailedView.style.display = "none";
		            this.btnToggleDetails.innerHTML = 'Детальна статистика <i class="ri-arrow-down-s-line" style="margin-left: 8px;"></i>';
		        }
		    });
		}`;

js = js.replace(`		this.containerPlaces = document.getElementById("analytics-places");`, constructorLogic);

let summaryRender = `
        const renderSurnamesList = renderSortableList(containerSurnames, surnamesMap, surnamesOrder, true);
        if (renderSurnamesList) renderSurnamesList('appearance');

        // Generate Summary Dashboard
        if (this.containerSummary) {
            let maxAge = 0;
            let minAge = null;
            let sumAge = 0;
            let ageCount = 0;
            let oldestPerson = null;
            
            const allSpans = [...lifespansConfirmed, ...lifespansApprox];
            for (const span of allSpans) {
                if (span.age > maxAge) {
                    maxAge = span.age;
                    oldestPerson = span;
                }
                if (minAge === null || span.age < minAge) {
                    minAge = span.age;
                }
                sumAge += span.age;
                ageCount++;
            }
            
            let avgAge = ageCount > 0 ? Math.round(sumAge / ageCount) : 0;
            
            // Top names and surnames
            const topM = Object.entries(namesM).sort((a,b) => b[1] - a[1])[0];
            const topF = Object.entries(namesF).sort((a,b) => b[1] - a[1])[0];
            const topS = Object.entries(surnamesMap).sort((a,b) => b[1] - a[1])[0];
            const topP = Object.entries(placesCount).sort((a,b) => b[1].total - a[1].total)[0];
            
            // Resolve place
            let topPlaceStr = "Немає даних";
            if (topP) {
                topPlaceStr = placeNameMap[topP[0]] || topP[0];
            }
            
            let html = \`
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px;">
                        <div style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 8px;">Загальна кількість</div>
                        <div style="font-size: 24px; font-weight: bold; color: var(--color-primary);">\${totalPeople}</div>
                        <div style="color: var(--color-text-meta); font-size: 12px; margin-top: 4px;">Чоловіків: \${maleCount} / Жінок: \${femaleCount}</div>
                    </div>
                    
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px;">
                        <div style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 8px;">Тривалість життя</div>
                        <div style="font-size: 24px; font-weight: bold; color: var(--color-primary);">\${avgAge} \` + (avgAge > 0 ? \`<span style="font-size: 14px; font-weight: normal; color: var(--color-text-meta);">р. в середньому</span>\` : \`\`) + \`</div>
                        <div style="color: var(--color-text-meta); font-size: 12px; margin-top: 4px;">Найдовша: \${maxAge > 0 ? maxAge : '-'} / Найкоротша: \${minAge !== null ? minAge : '-'}</div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
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
                </div>
            \`;
            
            this.containerSummary.innerHTML = html;
        }
`;

js = js.replace(`        const renderSurnamesList = renderSortableList(containerSurnames, surnamesMap, surnamesOrder, true);
        if (renderSurnamesList) renderSurnamesList('appearance');`, summaryRender);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
console.log("Analytics Manager patched 3.");
