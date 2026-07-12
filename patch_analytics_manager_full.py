import re

with open('scripts/components/interaction/analyticsManager.js', 'r') as f:
    js = f.read()

# 1. Back button logic and openBtn logic
old_close = """		this.closeBtn = document.getElementById("btn-close-analytics");
		if (this.closeBtn) {
		    this.closeBtn.addEventListener("click", () => {
		        if (window.app && window.app.navigateToId) {
		            window.app.navigateToId(window.app.currentProfileId || window.app.rootPersonId, false, "tree");
		        }
		    });
		}"""

new_close = """		this.closeBtn = document.getElementById("btn-close-analytics");
		if (this.closeBtn) {
		    this.closeBtn.addEventListener("click", () => {
		        if (window.app && window.app.navigateToId) {
		            window.app.navigateToId(window.app.currentProfileId || window.app.rootPersonId, false, "tree");
		        }
		    });
		}
		this.backBtn = document.getElementById("btn-back-analytics");
		if (this.backBtn) {
		    this.backBtn.addEventListener("click", () => {
		        if (window.app && window.app.navigateToId) {
		            window.app.navigateToId(window.app.currentProfileId || window.app.rootPersonId, false, "tree");
		        }
		    });
		}"""

js = js.replace(old_close, new_close)


old_open = """		if (this.openBtn) {
			this.openBtn.addEventListener("click", () => {
				if (window.app && window.app.navigateToId) {
					window.app.navigateToId(window.app.currentProfileId || window.app.rootPersonId, false, "analytics");
				}
			});
		}"""

new_open = """		if (this.openBtn) {
			this.openBtn.addEventListener("click", () => {
			    const url = new URL(window.location);
                if (url.searchParams.get("view") === "analytics") {
                    if (window.app && window.app.navigateToId) {
					    window.app.navigateToId(window.app.currentProfileId || window.app.rootPersonId, false, "tree");
				    }
                } else if (window.app && window.app.navigateToId) {
					window.app.navigateToId(window.app.currentProfileId || window.app.rootPersonId, false, "analytics");
				}
			});
		}"""

js = js.replace(old_open, new_open)

# 2. Numbering in names
old_normalize_name = """        const normalizeName = (name) => {
            return name.replace(/\?/g, '').trim().split(" ")[0];
        };"""

new_normalize_name = """        const normalizeName = (name) => {
            return name.replace(/[\?0-9]/g, '').trim().split(" ")[0];
        };"""

js = js.replace(old_normalize_name, new_normalize_name)

old_normalize_surname = """        const normalizeSurname = (surname) => {
            let s = surname.replace(/\?/g, '').trim();"""

new_normalize_surname = """        const normalizeSurname = (surname) => {
            let s = surname.replace(/[\?0-9]/g, '').trim();"""
            
js = js.replace(old_normalize_surname, new_normalize_surname)


# 3. Mobile sort select
old_sort_controls = """                    const controls = document.createElement('div');
                    controls.style.cssText = "display: inline-flex; gap: 10px; margin-left: 15px; font-size: 12px; font-weight: normal;";
                    controls.innerHTML = `
                        <span style="color: var(--color-text-muted); cursor: pointer;" data-sort="appearance">За згадкою</span>
                        <span style="color: var(--color-text-muted); cursor: pointer;" data-sort="alphabet">За абеткою</span>
                        <span style="color: var(--color-text-muted); cursor: pointer;" data-sort="frequency">За частотою</span>
                    `;
                    
                    const updateActive = (mode) => {
                        controls.querySelectorAll('span').forEach(s => {
                            if (s.dataset.sort === mode) {
                                s.style.color = "var(--color-primary)";
                                s.style.textDecoration = "underline";
                            } else {
                                s.style.color = "var(--color-text-muted)";
                                s.style.textDecoration = "none";
                            }
                        });
                    };
                    
                    controls.addEventListener('click', (e) => {
                        if (e.target.tagName === 'SPAN') {
                            const mode = e.target.dataset.sort;
                            updateActive(mode);
                            if (container.id === 'analytics-surnames') {
                                renderData(mode);
                            } else {
                                if (window.renderSortNamesLists) window.renderSortNamesLists(mode);
                            }
                        }
                    });"""

new_sort_controls = """                    const controls = document.createElement('div');
                    controls.className = "analytics-sort-controls";
                    controls.style.cssText = "display: inline-flex; margin-left: auto; font-size: 12px; font-weight: normal; align-items: center;";
                    controls.innerHTML = `
                        <style>
                            .sort-desktop { display: inline-flex; gap: 10px; }
                            .sort-mobile { display: none; }
                            @media (max-width: 768px) {
                                .sort-desktop { display: none !important; }
                                .sort-mobile { display: inline-block !important; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; padding: 2px 5px; font-size: 12px; }
                            }
                        </style>
                        <div class="sort-desktop">
                            <span style="color: var(--color-text-muted); cursor: pointer;" data-sort="appearance">За згадкою</span>
                            <span style="color: var(--color-text-muted); cursor: pointer;" data-sort="alphabet">За абеткою</span>
                            <span style="color: var(--color-text-muted); cursor: pointer;" data-sort="frequency">За частотою</span>
                        </div>
                        <select class="sort-mobile">
                            <option value="appearance">За згадкою</option>
                            <option value="alphabet">За абеткою</option>
                            <option value="frequency">За частотою</option>
                        </select>
                    `;
                    
                    const updateActive = (mode) => {
                        controls.querySelectorAll('span').forEach(s => {
                            if (s.dataset.sort === mode) {
                                s.style.color = "var(--color-primary)";
                                s.style.textDecoration = "underline";
                            } else {
                                s.style.color = "var(--color-text-muted)";
                                s.style.textDecoration = "none";
                            }
                        });
                        const select = controls.querySelector('select');
                        if (select) select.value = mode;
                    };
                    
                    controls.addEventListener('click', (e) => {
                        if (e.target.tagName === 'SPAN') {
                            const mode = e.target.dataset.sort;
                            updateActive(mode);
                            if (container.id === 'analytics-surnames') {
                                renderData(mode);
                            } else {
                                if (window.renderSortNamesLists) window.renderSortNamesLists(mode);
                            }
                        }
                    });
                    controls.querySelector('select').addEventListener('change', (e) => {
                        const mode = e.target.value;
                        updateActive(mode);
                        if (container.id === 'analytics-surnames') {
                            renderData(mode);
                        } else {
                            if (window.renderSortNamesLists) window.renderSortNamesLists(mode);
                        }
                    });"""

js = js.replace(old_sort_controls, new_sort_controls)

old_header_style = """const h4 = section.querySelector('h4');
                if (h4) {"""

new_header_style = """const h4 = section.querySelector('h4');
                if (h4) {
                    h4.style.display = "flex";
                    h4.style.justifyContent = "space-between";
                    h4.style.alignItems = "center";"""
                    
js = js.replace(old_header_style, new_header_style)

with open('scripts/components/interaction/analyticsManager.js', 'w') as f:
    f.write(js)
print("js initial patches done")
