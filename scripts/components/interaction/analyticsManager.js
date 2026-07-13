import { COLUMNS } from "../../core/dbSchema.js";
import { calculateAgeAtDeath } from "../../utils/dateUtils.js";
import { resolveCoatUrl } from "../../utils/coatUtils.js";
import { renderPersonTile } from "../ui/shared/personTile.js";

export class AnalyticsManager {
	constructor(engine) {
		this.engine = engine;
		this.openBtn = document.getElementById("btn-analytics");
		
		this.containerGeneral = document.getElementById("analytics-general");
		this.containerLifespan = document.getElementById("analytics-lifespan");
		this.containerNamesM = document.getElementById("analytics-names-m");
		this.containerNamesF = document.getElementById("analytics-names-f");

		
		
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
		}

		if (this.openBtn) {
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
		}
		this.closeBtn = document.getElementById("btn-close-analytics");
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
		}
	}

	render() {
		this.calculateStats();
	}

	initAccordions() {
	    const container = document.getElementById("analytics-view");
	    if (!container) return;
	    const sections = container.querySelectorAll(".analytics-section");
        sections.forEach(sec => {
            const h4 = sec.querySelector("h4");
            if (h4 && !h4.dataset.accordionInit) {
                h4.dataset.accordionInit = "true";
                h4.addEventListener("click", () => {
                    if (window.innerWidth <= 768) {
                        sec.classList.toggle("accordion-open");
                    }
                });
            }
        });
	}

	calculateStats() {
		if (!this.engine || !this.containerGeneral) return;
		this.initAccordions();

        let visibleIds = null;
        if (window.app && window.app.lineageManager && window.app.lineageManager.logic) {
            const mode = window.app.lineageManager.logic.mode;
            if (mode && mode !== "all") {
                visibleIds = new Set(window.app.lineageManager.logic.queue);
            }
        }

		// 1. General Stats
		let maleCount = 0;
		let femaleCount = 0;
		let unknownCount = 0;
		let totalPeople = 0;
		       let totalFamilies = 0;
        if (this.engine.db.familyList) {
            if (!visibleIds) {
                totalFamilies = this.engine.db.familyList.length;
            } else {
                this.engine.db.familyList.forEach(f => {
                    const hid = f[COLUMNS.family?.husbandId || "husband_id"];
                    const wid = f[COLUMNS.family?.wifeId || "wife_id"];
                    if (visibleIds.has(String(hid)) || visibleIds.has(String(wid))) {
                        totalFamilies++;
                    }
                });
            }
        }

		const namesM = {};
		const namesF = {};
		const placesCount = {};

		const lifespansConfirmed = [];
        const lifespansApprox = [];
        
        const surnamesMap = {};
        const nicknamesMap = {};
        const surnamesOrder = [];
        const nicknamesOrder = {};
        const namesMOrder = [];
        const namesFOrder = [];


		// Create quick lookups for events
		const birthMap = new Map();
		if (this.engine.db.birth) {
			this.engine.db.birth.forEach(b => {
				const pid = b[COLUMNS.birth?.personId || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;
				if (!birthMap.has(pid)) birthMap.set(pid, []);
				birthMap.get(pid).push(b);
			});
		}

		const deathMap = new Map();
		if (this.engine.db.death) {
			this.engine.db.death.forEach(d => {
				const pid = d[COLUMNS.death?.personId || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;
				if (!deathMap.has(pid)) deathMap.set(pid, []);
				deathMap.get(pid).push(d);
			});
		}
        
        // Count places
        const countPlace = (placeId, eventType) => {
            if (placeId && String(placeId).trim() !== "") {
                if (!placesCount[placeId]) placesCount[placeId] = { total: 0, events: {} };
                placesCount[placeId].total++;
                placesCount[placeId].events[eventType] = (placesCount[placeId].events[eventType] || 0) + 1;
            }
        };
        if (this.engine.db.birth) {
            this.engine.db.birth.forEach(b => {
                const pid = b[COLUMNS.birth?.personId || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;
                countPlace(b[COLUMNS.birth?.placeId || "place_id"], "народження");
            });
        }
        if (this.engine.db.death) {
            this.engine.db.death.forEach(d => {
                const pid = d[COLUMNS.death?.personId || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;
                countPlace(d[COLUMNS.death?.placeId || "place_id"], "смерть");
            });
        }
        if (this.engine.db.marriage) {
            this.engine.db.marriage.forEach(m => {
                const hid = m[COLUMNS.marriage?.husbandId || "husband_id"];
                const wid = m[COLUMNS.marriage?.wifeId || "wife_id"];
                if (visibleIds && !visibleIds.has(String(hid)) && !visibleIds.has(String(wid))) return;
                countPlace(m[COLUMNS.marriage?.placeId || "place_id"], "шлюб");
            });
        }
        if (this.engine.db.baptism) {
            this.engine.db.baptism.forEach(m => {
                const pid = m[COLUMNS.baptism?.personId || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;
                countPlace(m[COLUMNS.baptism?.placeId || "place_id"], "хрещення");
            });
        }
        if (this.engine.db.funeral) {
            this.engine.db.funeral.forEach(m => {
                const pid = m[COLUMNS.funeral?.personId || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;
                countPlace(m[COLUMNS.funeral?.placeId || "place_id"], "поховання");
            });
        }


        const normalizeSurname = (surname) => {
            let s = surname.replace(/[\?0-9]/g, '').trim();
            const boundary = "(?![А-Яа-яЄєІіЇїҐґa-zA-Z])";
            s = s.replace(new RegExp("ська" + boundary, "g"), "ський");
            s = s.replace(new RegExp("цька" + boundary, "g"), "цький");
            s = s.replace(new RegExp("зька" + boundary, "g"), "зький");
            
            s = s.replace(new RegExp("ова" + boundary, "g"), "ов");
            s = s.replace(new RegExp("єва" + boundary, "g"), "єв");
            s = s.replace(new RegExp("ева" + boundary, "g"), "ев");
            s = s.replace(new RegExp("іна" + boundary, "g"), "ін");
            s = s.replace(new RegExp("їна" + boundary, "g"), "їн");
            s = s.replace(new RegExp("ина" + boundary, "g"), "ин");
            s = s.replace(new RegExp("ая" + boundary, "g"), "ий");
            s = s.replace(new RegExp("яя" + boundary, "g"), "ій");
            
            return s;
        };

        const normalizeName = (name) => {
            return name.replace(/[\?0-9]/g, '').trim().split(" ")[0];
        };

        // Read surnames and names directly from DB if available, else from person
        if (this.engine.db.basic) {
            this.engine.db.basic.forEach(b => {
                const pid = b[COLUMNS.basic?.id || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;
                const s = b[COLUMNS.basic?.surname || "surname"];
                const n = b[COLUMNS.basic?.name || "name"];
                const g = String(b[COLUMNS.basic?.gender || "gender"]).trim().toLowerCase();
                
                if (s && String(s).trim() !== "") {
                    const cleanS = normalizeSurname(String(s));
                    if (cleanS) {
                        if (!surnamesMap[cleanS]) {
                            surnamesMap[cleanS] = 0;
                            surnamesOrder.push(cleanS);
                        }
                        surnamesMap[cleanS]++;
                    }
                }
                
                if (n && String(n).trim() !== "") {
                    const cleanN = normalizeName(String(n));
                    if (cleanN) {
                        if (g === "m" || g === "ч") {
                            if (!namesM[cleanN]) {
                                namesM[cleanN] = 0;
                                namesMOrder.push(cleanN);
                            }
                            namesM[cleanN]++;
                        } else if (g === "f" || g === "ж") {
                            if (!namesF[cleanN]) {
                                namesF[cleanN] = 0;
                                namesFOrder.push(cleanN);
                            }
                            namesF[cleanN]++;
                        }
                    }
                }
            });
        }
        if (this.engine.db.names) {
            this.engine.db.names.forEach(n => {
                const pid = n[COLUMNS.names?.personId || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;
                const nns = n[COLUMNS.names?.bNobleNicknames || "b_noble_nicknames"];
                const s = n[COLUMNS.names?.bSurname || "b_surname"];
                if (s && String(s).trim() !== "" && nns && String(nns).trim() !== "") {
                    let g = "u";
                    const pid = n[COLUMNS.names?.personId || "person_id"];
                    if (pid) {
                        const person = this.engine.getPerson(pid);
                        if (person) g = person.gender;
                    }
                    const cleanS = normalizeSurname(String(s));
                    const parts = String(nns).split(",").map(p => p.trim()).filter(p => p);
                    if (!nicknamesMap[cleanS]) nicknamesMap[cleanS] = {};
                    if (!nicknamesOrder[cleanS]) nicknamesOrder[cleanS] = [];
                    parts.forEach(p => {
                        if (!nicknamesMap[cleanS][p]) {
                            nicknamesMap[cleanS][p] = 0;
                            nicknamesOrder[cleanS].push(p);
                        }
                        nicknamesMap[cleanS][p]++;
                    });
                }
            });
        }

		this.engine.people.forEach((person, id) => {
            if (visibleIds && !visibleIds.has(String(id))) return;
		    totalPeople++;
			if (person.gender === "m" || person.gender === "ч") maleCount++;
			else if (person.gender === "f" || person.gender === "ж") femaleCount++;
			else {
			    // fallback to male if unknown to make sum match, since user said no unknown genders
			    maleCount++; 
			}

			// Lifespan
			const births = birthMap.get(id);
			const deaths = deathMap.get(id);
			if (births && births.length > 0 && deaths && deaths.length > 0) {
				const b = births[0];
				const d = deaths[0];
				
                const birthData = {
                    year: b[COLUMNS.birth?.year || "b_year"],
                    month: b[COLUMNS.birth?.month || "b_month"],
                    day: b[COLUMNS.birth?.day || "b_day"]
                };
                const deathData = {
                    year: d[COLUMNS.death?.year || "d_year"],
                    month: d[COLUMNS.death?.month || "d_month"],
                    day: d[COLUMNS.death?.day || "d_day"]
                };

                const age = calculateAgeAtDeath(birthData, deathData);
                if (age !== null && age >= 0 && age <= 120) {
                    const isApprox = !birthData.day || !birthData.month || !deathData.day || !deathData.month;
                    let fullName = person.name;
                    if (person.source === "basic") {
                        const pat = person.raw[COLUMNS.basic?.patronymic || "patronymic"];
                        if (pat && String(pat).trim() !== "") fullName += " " + String(pat).trim();
                    }
                    const bYear = birthData.year || "?";
                    const dYear = deathData.year || "?";
                    if (isApprox) lifespansApprox.push({age, id, name: fullName, bYear, dYear});
                    else lifespansConfirmed.push({age, id, name: fullName, bYear, dYear});
                }
			}
		});

		// Render General
		this.containerGeneral.innerHTML = `
			<div class="analytics-stat-card" style="justify-content: flex-start; padding-top: 15px;">
				<div class="analytics-general-value">${totalPeople}</div>
				<div class="analytics-stat-label">Осіб у дереві</div>
			</div>
			<div class="analytics-stat-card" style="justify-content: flex-start; padding-top: 15px;">
				<div class="analytics-general-value">${maleCount} / ${femaleCount}</div>
				<div class="analytics-stat-label">Чоловіків / Жінок</div>
			</div>
		`;


        // Render Lifespan
        let lifespanHtml = '';
        
        const renderLifespanBlock = (title, spans) => {
            if (spans.length === 0) return '';
			let sum = 0;
            let maxAge = spans.length > 0 ? Math.max(...spans.map(s => s.age)) : 0;
			for(let i=0; i<spans.length; i++) {
				sum += spans[i].age;
			}
			const avg = Math.round(sum / spans.length);
			
			const sortedSpans = [...spans].sort((a, b) => b.age - a.age);
			
			const makeTag = (obj) => {
				const shortName = obj.name ? obj.name.replace(/[\?0-9]/g, '').trim() : "Невідомо";
                const widthPercent = maxAge > 0 ? (obj.age / maxAge) * 100 : 0;
				return `<a href="#" onclick="event.preventDefault(); if(window.app && window.app.navigateToId) { window.app.navigateToId('${obj.id}', false, 'profile'); }" style="display: flex; align-items: center; background: var(--color-bg-card); border: 1px solid var(--color-border-light); border-radius: 20px; padding: 4px 12px 4px 4px; text-decoration: none; color: var(--color-text-main); font-size: 14px; gap: 8px; transition: opacity 0.2s; width: ${widthPercent}%; min-width: 120px; margin-bottom: 4px;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
					<span style="background: var(--color-bg-body); color: var(--color-text-muted); border-radius: 16px; padding: 2px 8px; font-weight: bold; font-size: 13px; flex-shrink: 0;">${obj.age}</span>
					<span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500;">${shortName}</span>
				</a>`;
			};
			
            let rowsHtml = '';
            let avgLineInserted = false;
            
            sortedSpans.forEach(s => {
                if (!avgLineInserted && s.age < avg) {
                    rowsHtml += `<div style="display: flex; align-items: center; margin: 12px 0; color: var(--color-text-muted); font-size: 13px; width: 100%;">
                        Середній вік: ${avg}
                        <div style="flex-grow: 1; height: 1px; background: var(--color-primary); margin-left: 12px; opacity: 0.3;"></div>
                    </div>`;
                    avgLineInserted = true;
                }
                rowsHtml += makeTag(s);
            });
            
            if (!avgLineInserted) {
                 rowsHtml += `<div style="display: flex; align-items: center; margin: 12px 0; color: var(--color-text-muted); font-size: 13px; width: 100%;">
                        Середній вік: ${avg}
                        <div style="flex-grow: 1; height: 1px; background: var(--color-primary); margin-left: 12px; opacity: 0.3;"></div>
                    </div>`;
            }

            return `
                <div style="max-width: 800px; margin: 0 auto; width: 100%;">
                    <div class="analytics-stat-title" style="margin-bottom: 12px; font-weight: bold; font-size: 16px;">${title}</div>
                    <div style="display: flex; flex-direction: column; width: 100%; margin-bottom: 32px;">
                        ${rowsHtml}
                    </div>
                </div>
            `;
        };
        
        lifespanHtml += renderLifespanBlock('Підтверджений', lifespansConfirmed);
        lifespanHtml += renderLifespanBlock('Непідтверджений', lifespansApprox);
        
        if (lifespansConfirmed.length === 0 && lifespansApprox.length === 0) {
            this.containerLifespan.innerHTML = `<div class="analytics-stat-title">Недостатньо даних для розрахунку тривалості життя</div>`;
        } else {
            this.containerLifespan.innerHTML = lifespanHtml;
        }


		// Helper to render sortable list
        const renderSortableList = (container, dataMap, orderArray, includeNicknames = false) => {
            if (!container) return;
            
            const renderData = (sortMode) => {
                let sortedEntries = [];
                if (sortMode === 'appearance') {
                    sortedEntries = orderArray.map(k => [k, dataMap[k]]);
                } else if (sortMode === 'alphabet') {
                    sortedEntries = Object.entries(dataMap).sort((a, b) => a[0].localeCompare(b[0]));
                } else if (sortMode === 'frequency') {
                    sortedEntries = Object.entries(dataMap).sort((a, b) => b[1] - a[1]);
                }

                
                container.style.display = "flex";
                container.style.flexWrap = "wrap";
                container.style.gap = "8px";
                container.innerHTML = sortedEntries.map(s => {
                    let hasNicknames = includeNicknames && nicknamesMap[s[0]];
                    
                    let html = `<li style="list-style: none; display: inline-flex; flex-direction: column; background: var(--color-bg-card); border: 1px solid var(--color-border-light); border-radius: 8px; padding: 4px 12px; font-size: 14px; color: var(--color-text-main);">`;
                    
                    html += `<div style="display: flex; align-items: center; gap: 6px;">
                        <span>${s[0]}</span> 
                        <span style="background: var(--color-bg-body); padding: 2px 6px; border-radius: 12px; font-size: 12px; color: var(--color-text-muted);">${s[1]}</span>
                    </div>`;

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
                            html += `<div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--color-border-light);">`;
                            html += sortedNn.map(nn => `<span style="font-size: 12px; color: var(--color-text-muted);">${nn[0]} (${nn[1]})</span>`).join('');
                            html += `</div>`;
                        }
                    }
                    html += `</li>`;
                    return html;
                }).join('');

            };
            
            // Set up sorting controls inside the section header
            const section = container.closest('.analytics-section');
            if (section && !section.dataset.sortedInit) {
                section.dataset.sortedInit = "true";
                const h4 = section.querySelector('h4');
                if (h4) {
// Handled by CSS
                    const controls = document.createElement('div');
                    controls.className = "analytics-sort-controls";
                    // using CSS class analytics-sort-controls
                    controls.innerHTML = `
                        
                        <div class="sort-desktop">
                            <span data-sort="appearance">За згадкою</span>
                            <span data-sort="alphabet">За абеткою</span>
                            <span data-sort="frequency">За частотою</span>
                        </div>
                        <div class="sort-mobile-popup">
                            <div class="sort-mobile-trigger">За згадкою <i class="ri-arrow-down-s-line"></i></div>
                            <div class="sort-mobile-menu">
                                <div data-sort="appearance">За згадкою</div>
                                <div data-sort="alphabet">За абеткою</div>
                                <div data-sort="frequency">За частотою</div>
                            </div>
                        </div>
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
                        // Desktop span click
                        if (e.target.tagName === 'SPAN') {
                            const mode = e.target.dataset.sort;
                            updateActive(mode);
                            if (container.id === 'analytics-surnames') {
                                renderData(mode);
                            } else {
                                if (window.renderSortNamesLists) window.renderSortNamesLists(mode);
                            }
                        }
                        
                        // Mobile dropdown toggle
                        const trigger = e.target.closest('.sort-mobile-trigger');
                        if (trigger) {
                            controls.querySelector('.sort-mobile-popup').classList.toggle('open');
                            return;
                        }
                        
                        // Mobile dropdown item click
                        const menuItem = e.target.closest('.sort-mobile-menu div');
                        if (menuItem) {
                            const mode = menuItem.dataset.sort;
                            const popup = controls.querySelector('.sort-mobile-popup');
                            popup.classList.remove('open');
                            
                            let label = 'За згадкою';
                            if (mode === 'alphabet') label = 'За абеткою';
                            if (mode === 'frequency') label = 'За частотою';
                            
                            popup.querySelector('.sort-mobile-trigger').innerHTML = label + ' <i class="ri-arrow-down-s-line"></i>';
                            
                            updateActive(mode);
                            if (container.id === 'analytics-surnames') {
                                renderData(mode);
                            } else {
                                if (window.renderSortNamesLists) window.renderSortNamesLists(mode);
                            }
                        }
                    });
                    
                    document.addEventListener('click', (e) => {
                        if (!e.target.closest('.sort-mobile-popup')) {
                            const popups = controls.querySelectorAll('.sort-mobile-popup.open');
                            popups.forEach(p => p.classList.remove('open'));
                        }
                    });
                    
                    h4.appendChild(controls);
                    updateActive('appearance');
                    
                    if (container.id !== 'analytics-surnames') {
                       window.renderSortNamesLists = (mode) => {
                           if (window.renderSortableListM) window.renderSortableListM(mode);
                           if (window.renderSortableListF) window.renderSortableListF(mode);
                       };
                    }
                }
            }
            return renderData;
        };

		// Render Names & Surnames
        window.renderSortableListM = renderSortableList(this.containerNamesM, namesM, namesMOrder);
        window.renderSortableListF = renderSortableList(this.containerNamesF, namesF, namesFOrder);
        if (window.renderSortableListM) window.renderSortableListM('appearance');
        if (window.renderSortableListF) window.renderSortableListF('appearance');

        const containerSurnames = document.getElementById("analytics-surnames");

        const renderSurnamesList = renderSortableList(containerSurnames, surnamesMap, surnamesOrder, true);
        if (renderSurnamesList) renderSurnamesList('appearance');

                // Resolve place names
        const placesDb = this.engine.db.places || [];
        const placeNameMap = {};
        placesDb.forEach(p => {
            placeNameMap[p[COLUMNS.places?.id || "place_id"]] = p[COLUMNS.places?.nameCurrent || "name_current"] || p[COLUMNS.places?.nameHist || "name_hist"] || "Невідомо";
        });

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
            }
            
            let html = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px;">
                        <div style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 8px;">Загальна кількість</div>
                        <div style="font-size: 24px; font-weight: bold; color: var(--color-primary);">${totalPeople}</div>
                        <div style="color: var(--color-text-meta); font-size: 12px; margin-top: 4px;">Чоловіків: ${maleCount} / Жінок: ${femaleCount}</div>
                    </div>
                    
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px;">
                        <div style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 8px;">Тривалість життя</div>
                        <div style="font-size: 24px; font-weight: bold; color: var(--color-primary);">${avgAge} ` + (avgAge > 0 ? `<span style="font-size: 14px; font-weight: normal; color: var(--color-text-meta);">р. в середньому</span>` : ``) + `</div>
                        <div style="color: var(--color-text-meta); font-size: 12px; margin-top: 4px;">Найдовша: ${maxAge > 0 ? maxAge : '-'} / Найкоротша: ${minAge !== null ? minAge : '-'}</div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; border-top: 4px solid var(--color-male);">
                        <div style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 8px;">Найпопулярніше ч. ім'я</div>
                        <div style="font-size: 18px; font-weight: 500; color: var(--color-text-main);">${topM ? topM[0] : '-'}</div>
                        <div style="color: var(--color-text-meta); font-size: 12px; margin-top: 4px;">Зустрічається ${topM ? topM[1] : 0} разів</div>
                    </div>
                    
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; border-top: 4px solid var(--color-female);">
                        <div style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 8px;">Найпопулярніше ж. ім'я</div>
                        <div style="font-size: 18px; font-weight: 500; color: var(--color-text-main);">${topF ? topF[0] : '-'}</div>
                        <div style="color: var(--color-text-meta); font-size: 12px; margin-top: 4px;">Зустрічається ${topF ? topF[1] : 0} разів</div>
                    </div>
                    
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; border-top: 4px solid var(--color-primary-light);">
                        <div style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 8px;">Найпоширеніше прізвище</div>
                        <div style="font-size: 18px; font-weight: 500; color: var(--color-text-main);">${topS ? topS[0] : '-'}</div>
                        <div style="color: var(--color-text-meta); font-size: 12px; margin-top: 4px;">Зустрічається ${topS ? topS[1] : 0} разів</div>
                    </div>
                    
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; border-top: 4px solid var(--color-border);">
                        <div style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 8px;">Основний нас. пункт</div>
                        <div style="font-size: 16px; font-weight: 500; color: var(--color-text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${topPlaceStr}</div>
                        <div style="color: var(--color-text-meta); font-size: 12px; margin-top: 4px;">Пов'язано ${topP ? topP[1].total : 0} подій</div>
                    </div>
                    
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; border-top: 4px solid var(--color-border);">
                        <div style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 8px;">Найчастіша причина смерті</div>
                        <div style="font-size: 16px; font-weight: 500; color: var(--color-text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${topDeathStr}</div>
                        <div style="color: var(--color-text-meta); font-size: 12px; margin-top: 4px;">Зустрічається ${topDeathCount} разів</div>
                    </div>
                    
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; border-top: 4px solid var(--color-border);">
                        <div style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 8px;">Найпоширеніший герб</div>
                        <div style="font-size: 16px; font-weight: 500; color: var(--color-text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${topCoatStr}</div>
                        <div style="color: var(--color-text-meta); font-size: 12px; margin-top: 4px;">${topCoatCount > 0 ? "Зустрічається " + topCoatCount + " разів" : "-"}</div>
                    </div>
                </div>
            `;
            
            this.containerSummary.innerHTML = html;
        }


		// Render Places
		const topPlaces = Object.entries(placesCount).sort((a, b) => b[1].total - a[1].total);


        
        const getEventWord = (count) => {
            const lastDigit = count % 10;
            const lastTwo = count % 100;
            if (lastTwo >= 11 && lastTwo <= 19) return "подій";
            if (lastDigit === 1) return "подія";
            if (lastDigit >= 2 && lastDigit <= 4) return "події";
            return "подій";
        };

		
		this.containerPlaces.style.display = "flex";
		this.containerPlaces.style.flexWrap = "wrap";
		this.containerPlaces.style.gap = "8px";
		this.containerPlaces.innerHTML = topPlaces.map(p => {
            const total = p[1].total;
            const eventsObj = p[1].events;
            
            return `
            <li style="list-style: none; display: inline-flex; flex-direction: column; background: var(--color-bg-card); border: 1px solid var(--color-border-light); border-radius: 8px; padding: 4px 12px; font-size: 14px; color: var(--color-text-main);">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span>${placeNameMap[p[0]] || "Невідоме місце (" + p[0] + ")"}</span>
                    <span style="background: var(--color-bg-body); padding: 2px 6px; border-radius: 12px; font-size: 12px; color: var(--color-text-muted);">${total} ${getEventWord(total)}</span>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--color-border-light);">
                    ${Object.entries(eventsObj).map(e => `<span style="font-size: 12px; color: var(--color-text-muted);">${e[0]} (${e[1]})</span>`).join("")}
                </div>
            </li>
        `}).join("");


        // Causes of death
        const containerDeaths = document.getElementById("analytics-deaths");
        if (containerDeaths && this.engine.db.death) {
            const deathsMap = {};
            this.engine.db.death.forEach(d => {
                let cause = d[COLUMNS.death?.cause || "d_cause"];
                if (cause && String(cause).trim() !== "") {
                    cause = String(cause).trim();
                    deathsMap[cause] = (deathsMap[cause] || 0) + 1;
                }
            });
            const topDeaths = Object.entries(deathsMap).sort((a, b) => b[1] - a[1]);
            containerDeaths.style.display = "flex";
            containerDeaths.style.flexWrap = "wrap";
            containerDeaths.style.gap = "8px";
            containerDeaths.innerHTML = topDeaths.map(d => `
                <li style="list-style: none; display: inline-flex; align-items: center; gap: 6px; background: var(--color-bg-card); border: 1px solid var(--color-border-light); border-radius: 8px; padding: 4px 12px; font-size: 14px; color: var(--color-text-main);">
                    <span>${d[0]}</span>
                    <span style="background: var(--color-bg-body); padding: 2px 6px; border-radius: 12px; font-size: 12px; color: var(--color-text-muted);">${d[1]}</span>
                </li>
            `).join("");
        }

// Coats of arms
        const containerCoats = document.getElementById("analytics-coats");
        if (containerCoats && this.engine.db.coats) {
            const coatsMap = {};
            if (this.engine.db.names) {
                this.engine.db.names.forEach(n => {
                    const bCoat = n[COLUMNS.names?.bCoat || "b_coat_of_arms"];
                    const mCoat = n[COLUMNS.names?.mCoat || "m_coat_of_arms"];
                    const s = n[COLUMNS.names?.bSurname || "b_surname"] || "";
                    if (s && String(s).trim() !== "") {
                        let g = "u";
                        const pid = n[COLUMNS.names?.personId || "person_id"];
                        if (pid) {
                            const person = this.engine.getPerson(pid);
                            if (person) g = person.gender;
                        }
                        const cleanS = normalizeSurname(String(s));
                        if (bCoat && String(bCoat).trim() !== "") {
                            if (!coatsMap[String(bCoat).trim()]) coatsMap[String(bCoat).trim()] = new Set();
                            coatsMap[String(bCoat).trim()].add(cleanS);
                        }
                        if (mCoat && String(mCoat).trim() !== "") {
                            if (!coatsMap[String(mCoat).trim()]) coatsMap[String(mCoat).trim()] = new Set();
                            coatsMap[String(mCoat).trim()].add(cleanS);
                        }
                    }
                });
            }
            const coatsData = [];
            this.engine.db.coats.forEach(c => {
                const name = c[COLUMNS.coats?.name || "coat_of_arms"];
                const url = c[COLUMNS.coats?.url || "coat_of_arms_url"];
                if (name && url) {
                    coatsData.push({name, url});
                }
            });
            containerCoats.innerHTML = coatsData.map(c => {
                const surnamesList = coatsMap[c.name] ? Array.from(coatsMap[c.name]) : [];
                const surnamesHtml = surnamesList.length > 0 ? `<span class="analytics-coat-surnames">${surnamesList.join(", ")}</span>` : "";
                return `
                <li class="analytics-coat-item">
                    <img class="analytics-coat-img" src="${resolveCoatUrl(c.name, {coats: this.engine.db.coats})}" alt="${c.name}">
                    <span class="analytics-coat-name">${c.name}</span>
                    ${surnamesHtml}
                </li>
            `}).join("");
        }

	}
}
