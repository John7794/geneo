import re

with open('scripts/components/interaction/analyticsManager.js', 'r') as f:
    js = f.read()

# 1. Render General
old_render_general = """		this.containerGeneral.innerHTML = `
            <div style="flex: 1; text-align: center; border-right: 1px solid var(--color-border); padding: 10px;">
                <div style="font-size: 24px; font-weight: bold; color: var(--color-primary);">${totalPeople}</div>
                <div style="font-size: 12px; color: var(--color-text-muted);">Осіб у дереві</div>
            </div>
            <div style="flex: 1; text-align: center; padding: 10px;">
                <div style="font-size: 24px; font-weight: bold; color: var(--color-primary);">${maleCount} / ${femaleCount}${unknownCount > 0 ? ' / ' + unknownCount : ''}</div>
                <div style="font-size: 12px; color: var(--color-text-muted);">Чоловіків / Жінок${unknownCount > 0 ? ' / Невідомо' : ''}</div>
            </div>
        `;"""

new_render_general = """		this.containerGeneral.innerHTML = `
            <div class="analytics-general-card bordered">
                <div class="analytics-general-value">${totalPeople}</div>
                <div class="analytics-stat-label">Осіб у дереві</div>
            </div>
            <div class="analytics-general-card">
                <div class="analytics-general-value">${maleCount} / ${femaleCount}${unknownCount > 0 ? ' / ' + unknownCount : ''}</div>
                <div class="analytics-stat-label">Чоловіків / Жінок${unknownCount > 0 ? ' / Невідомо' : ''}</div>
            </div>
        `;"""
        
js = js.replace(old_render_general, new_render_general)

# 2. Render Lifespan
old_render_lifespan = """			const makeLink = (obj) => {
				const shortName = obj.name ? obj.name.replace(/\?/g, '').trim() : "Невідомо";
				return `<span style="font-weight: bold;">${obj.age}</span><br><span style="font-size: 0.65em; color: var(--color-text-muted);">(<a href="#" onclick="event.preventDefault(); if(window.app && window.app.navigateToId) { window.app.navigateToId('${obj.id}', false, 'profile');  }" style="color: var(--color-text-muted); text-decoration: underline;">${shortName}</a>)</span>`;
			};
			
            return `
                <div style="grid-column: span 3; color: var(--color-text-muted); font-size: 14px; margin-top: 10px;">${title}</div>
                <div style="background: var(--color-bg-sub); padding: 10px; border-radius: 8px; text-align: center;">
					<div style="font-size: 20px; font-weight: bold;">${avg}</div>
					<div style="font-size: 12px; color: var(--color-text-muted);">Середня</div>
				</div>
				<div style="background: var(--color-bg-sub); padding: 10px; border-radius: 8px; text-align: center; display: flex; flex-direction: column; justify-content: center;">
					<div style="font-size: 20px;">${makeLink(maxObj)}</div>
					<div style="font-size: 12px; color: var(--color-text-muted);">Найбільша</div>
				</div>
				<div style="background: var(--color-bg-sub); padding: 10px; border-radius: 8px; text-align: center; display: flex; flex-direction: column; justify-content: center;">
					<div style="font-size: 20px;">${makeLink(minObj)}</div>
					<div style="font-size: 12px; color: var(--color-text-muted);">Найменша</div>
				</div>
            `;"""

new_render_lifespan = """			const makeLink = (obj) => {
				const shortName = obj.name ? obj.name.replace(/[\?0-9]/g, '').trim() : "Невідомо";
				return `<span class="analytics-stat-value">${obj.age}</span><br><span style="font-size: 0.65em; color: var(--color-text-muted);">(<a href="#" onclick="event.preventDefault(); if(window.app && window.app.navigateToId) { window.app.navigateToId('${obj.id}', false, 'profile');  }" style="color: var(--color-text-muted); text-decoration: underline;">${shortName}</a>)</span>`;
			};
			
            return `
                <div class="analytics-stat-title">${title}</div>
                <div class="analytics-stat-card">
					<div class="analytics-stat-value">${avg}</div>
					<div class="analytics-stat-label">Середня</div>
				</div>
				<div class="analytics-stat-card">
					<div style="font-size: 20px;">${makeLink(maxObj)}</div>
					<div class="analytics-stat-label">Найбільша</div>
				</div>
				<div class="analytics-stat-card">
					<div style="font-size: 20px;">${makeLink(minObj)}</div>
					<div class="analytics-stat-label">Найменша</div>
				</div>
            `;"""
            
js = js.replace(old_render_lifespan, new_render_lifespan)

# 3. Sort controls styles removal
old_sort_style = """<style>
                            .sort-desktop { display: inline-flex; gap: 10px; }
                            .sort-mobile { display: none; }
                            @media (max-width: 768px) {
                                .sort-desktop { display: none !important; }
                                .sort-mobile { display: inline-block !important; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; padding: 2px 5px; font-size: 12px; }
                            }
                        </style>"""
                        
js = js.replace(old_sort_style, "")

old_controls_cssText = """controls.style.cssText = "display: inline-flex; margin-left: auto; font-size: 12px; font-weight: normal; align-items: center;";"""
new_controls_cssText = """// using CSS class analytics-sort-controls"""
js = js.replace(old_controls_cssText, new_controls_cssText)

# 4. Sortable List HTML (surnames & names)
old_render_data = """                container.innerHTML = sortedEntries.map(s => {
                    let html = `<li style="margin-bottom: 5px;">${s[0]} <span style="color: var(--color-text-muted); font-size: 0.85em;">(${s[1]})</span>`;
                    if (includeNicknames && nicknamesMap[s[0]]) {
                        let sortedNn = [];
                        if (sortMode === 'appearance') {
                            sortedNn = (nicknamesOrder[s[0]] || []).map(k => [k, nicknamesMap[s[0]][k]]);
                        } else if (sortMode === 'alphabet') {
                            sortedNn = Object.entries(nicknamesMap[s[0]]).sort((a, b) => a[0].localeCompare(b[0]));
                        } else if (sortMode === 'frequency') {
                            sortedNn = Object.entries(nicknamesMap[s[0]]).sort((a, b) => b[1] - a[1]);
                        }
                        
                        if (sortedNn.length > 0) {
                            html += `<ul style="padding-left: 20px; margin-top: 5px; margin-bottom: 5px; list-style: circle;">`;
                            html += sortedNn.map(nn => `<li style="margin-bottom: 2px;">${nn[0]} <span style="color: var(--color-text-muted); font-size: 0.85em;">(${nn[1]})</span></li>`).join('');
                            html += `</ul>`;
                        }
                    }
                    html += `</li>`;
                    return html;
                }).join('');"""
                
new_render_data = """                container.innerHTML = sortedEntries.map(s => {
                    let hasNicknames = includeNicknames && nicknamesMap[s[0]];
                    let html = `<li class="analytics-list-item ${hasNicknames ? 'has-sublist' : ''}">`;
                    html += `<div class="analytics-list-item-content"><span>${s[0]}</span> <span class="analytics-list-count">(${s[1]})</span></div>`;
                    if (hasNicknames) {
                        let sortedNn = [];
                        if (sortMode === 'appearance') {
                            sortedNn = (nicknamesOrder[s[0]] || []).map(k => [k, nicknamesMap[s[0]][k]]);
                        } else if (sortMode === 'alphabet') {
                            sortedNn = Object.entries(nicknamesMap[s[0]]).sort((a, b) => a[0].localeCompare(b[0]));
                        } else if (sortMode === 'frequency') {
                            sortedNn = Object.entries(nicknamesMap[s[0]]).sort((a, b) => b[1] - a[1]);
                        }
                        
                        if (sortedNn.length > 0) {
                            html += `<ul class="analytics-sublist">`;
                            html += sortedNn.map(nn => `<li class="analytics-sublist-item"><span>${nn[0]}</span> <span class="analytics-list-count">(${nn[1]})</span></li>`).join('');
                            html += `</ul>`;
                        }
                    }
                    html += `</li>`;
                    return html;
                }).join('');"""
                
js = js.replace(old_render_data, new_render_data)

# 5. Places Render
old_places_render = """            return `
            <li style="margin-bottom: 10px; display: flex; flex-direction: column; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px solid var(--color-border);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="font-weight: 500;">${placeNameMap[p[0]] || "Невідоме місце (" + p[0] + ")"}</span>
                    <span style="background: var(--color-bg-sub); padding: 2px 8px; border-radius: 12px; font-size: 0.85em; font-weight: bold;">${total} ${getEventWord(total)}</span>
                </div>
                <div style="font-size: 0.8em; color: var(--color-text-muted);">
                    (${eventsStr})
                </div>
            </li>
        `"""

new_places_render = """            return `
            <li class="analytics-place-item">
                <div class="analytics-place-header">
                    <span class="analytics-place-name">${placeNameMap[p[0]] || "Невідоме місце (" + p[0] + ")"}</span>
                    <span class="analytics-place-badge">${total} ${getEventWord(total)}</span>
                </div>
                <div class="analytics-place-events">
                    (${eventsStr})
                </div>
            </li>
        `"""

js = js.replace(old_places_render, new_places_render)


# 6. Deaths Render
old_deaths_render = """            containerDeaths.innerHTML = topDeaths.map(d => `
                <li style="margin-bottom: 5px; display: flex; justify-content: space-between;">
                    <span>${d[0]}</span>
                    <span style="color: var(--color-text-muted); font-size: 0.85em;">(${d[1]})</span>
                </li>
            `).join("");"""
            
new_deaths_render = """            containerDeaths.innerHTML = topDeaths.map(d => `
                <li class="analytics-list-item">
                    <span>${d[0]}</span>
                    <span class="analytics-list-count">(${d[1]})</span>
                </li>
            `).join("");"""
            
js = js.replace(old_deaths_render, new_deaths_render)


# 7. Religions Render
old_religions_render = """            containerReligions.innerHTML = topReligions.map(r => `
                <li style="margin-bottom: 5px; display: flex; justify-content: space-between;">
                    <span>${r[0]}</span>
                    <span style="color: var(--color-text-muted); font-size: 0.85em;">(${r[1]})</span>
                </li>
            `).join("");"""
            
new_religions_render = """            containerReligions.innerHTML = topReligions.map(r => `
                <li class="analytics-list-item">
                    <span>${r[0]}</span>
                    <span class="analytics-list-count">(${r[1]})</span>
                </li>
            `).join("");"""
            
js = js.replace(old_religions_render, new_religions_render)


# 8. Coats of arms render
old_coats_render = """                return `
                <li style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 5px; background: var(--color-bg-sub); padding: 10px; border-radius: 8px;">
                    <img src="./data/media/${c.url}" alt="${c.name}" style="max-width: 100%; height: auto; max-height: 80px; object-fit: contain;">
                    <span style="font-size: 12px; font-weight: bold;">${c.name}</span>
                    ${surnamesHtml}
                </li>
            `"""

new_coats_render = """                return `
                <li class="analytics-coat-item">
                    <img class="analytics-coat-img" src="./data/media/${c.url}" alt="${c.name}">
                    <span class="analytics-coat-name">${c.name}</span>
                    ${surnamesHtml}
                </li>
            `"""
            
js = js.replace(old_coats_render, new_coats_render)

# Remove h4 inline styles overrides
old_h4_styles = """                    h4.style.display = "flex";
                    h4.style.justifyContent = "space-between";
                    h4.style.alignItems = "center";"""
new_h4_styles = """// Handled by CSS"""
js = js.replace(old_h4_styles, new_h4_styles)

with open('scripts/components/interaction/analyticsManager.js', 'w') as f:
    f.write(js)
print("CSS patches for analyticsManager done")
