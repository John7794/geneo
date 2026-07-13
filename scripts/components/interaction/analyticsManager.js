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
        try {
		    this.calculateStats();
        } catch (e) {
            if (this.containerSummary) {
                this.containerSummary.innerHTML = '<div style="color:red; font-size:20px;">ERROR: ' + e.message + '<br>' + e.stack + '</div>';
            }
        }
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
                const pName = String(placeId).trim();
                if (!placesCount[pName]) placesCount[pName] = { total: 0, events: {} };
                placesCount[pName].total++;
                placesCount[pName].events[eventType] = (placesCount[pName].events[eventType] || 0) + 1;
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
        if (this.engine.db.familyList) {
            this.engine.db.familyList.forEach(f => {
                const pid = f[COLUMNS.familyList?.id || "fam_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;
                countPlace(f[COLUMNS.familyList?.birthPlace || "fam_birth_place"], "народження");
                countPlace(f[COLUMNS.familyList?.deathPlace || "fam_death_place"], "смерть");
                countPlace(f[COLUMNS.familyList?.origin || "fam_origin_place"], "походження");
            });
        }
        if (this.engine.db.participants) {
            this.engine.db.participants.forEach(p => {
                const pid = p[COLUMNS.participants?.id || "p_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;
                countPlace(p[COLUMNS.participants?.birthPlace || "p_birth_place"], "народження");
                countPlace(p[COLUMNS.participants?.deathPlace || "p_death_place"], "смерть");
                countPlace(p[COLUMNS.participants?.origin || "p_origin_place"], "походження");
            });
        }


        console.log("Basic length:", this.engine.db.basic?.length); const normalizeSurname = (surname) => {
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
                    let exactDays = null;
                    if (!isApprox) {
                        const bDate = new Date(Date.UTC(birthData.year, birthData.month - 1, birthData.day));
                        const dDate = new Date(Date.UTC(deathData.year, deathData.month - 1, deathData.day));
                        const ms = dDate.getTime() - bDate.getTime();
                        if (ms > 0) exactDays = Math.floor(ms / (1000 * 60 * 60 * 24));
                    }
                    if (isApprox) lifespansApprox.push({age, id, name: fullName, bYear, dYear, exactDays});
                    else lifespansConfirmed.push({age, id, name: fullName, bYear, dYear, exactDays});
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
			let sumAge = 0;
            let sumDays = 0;
            let hasExact = spans.some(s => s.exactDays !== null && s.exactDays !== undefined);

            let maxMetric = 0;
            if (hasExact) {
                maxMetric = spans.length > 0 ? Math.max(...spans.map(s => s.exactDays || (s.age * 365.25))) : 0;
            } else {
                maxMetric = spans.length > 0 ? Math.max(...spans.map(s => s.age)) : 0;
            }

			for(let i=0; i<spans.length; i++) {
				sumAge += spans[i].age;
                if (hasExact) {
                    sumDays += spans[i].exactDays || (spans[i].age * 365.25);
                }
			}
			const avgAge = Math.round(sumAge / spans.length);
            const avgDays = hasExact ? Math.round(sumDays / spans.length) : 0;
			
			const sortedSpans = [...spans].sort((a, b) => {
                if (hasExact) {
                    let aVal = a.exactDays !== null && a.exactDays !== undefined ? a.exactDays : (a.age * 365.25);
                    let bVal = b.exactDays !== null && b.exactDays !== undefined ? b.exactDays : (b.age * 365.25);
                    return bVal - aVal;
                }
                return b.age - a.age;
            });
			
			const makeTag = (obj) => {
				const shortName = obj.name ? obj.name.replace(/[\\?0-9]/g, '').trim() : "Невідомо";
                let metric = hasExact ? (obj.exactDays !== null && obj.exactDays !== undefined ? obj.exactDays : (obj.age * 365.25)) : obj.age;
                const widthPercent = maxMetric > 0 ? (metric / maxMetric) * 100 : 0;
                
                let displayAge = obj.age + " р.";
                if (obj.exactDays !== null && obj.exactDays !== undefined) {
                    let y = Math.floor(obj.exactDays / 365.25);
                    let d = Math.round(obj.exactDays % 365.25);
                    displayAge = y + " р. " + d + " дн.";
                }

                let avatarHtml = '';
                if (obj && obj.id && window.app && window.app.engine && window.app.engine.db) {
                    const person = window.app.engine.db.names.find(n => n.id === obj.id);
                    if (person) {
                        const avatarPath = window.app.engine.getPersonPhoto(person);
                        if (avatarPath) {
                            avatarHtml = `<img src="${avatarPath}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;" />`;
                        } else {
                            avatarHtml = `<div style="width: 24px; height: 24px; border-radius: 50%; background: var(--color-bg-body); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 10px;"><i class="ri-user-3-line"></i></div>`;
                        }
                    }
                } else if (obj) {
                     avatarHtml = `<div style="width: 24px; height: 24px; border-radius: 50%; background: var(--color-bg-body); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 10px;"><i class="ri-user-3-line"></i></div>`;
                }

				return `
                <div style="width: 100%; display: flex; align-items: center; margin-bottom: 8px;">
                    <a href="#" onclick="event.preventDefault(); if(window.app && window.app.navigateToId) { window.app.navigateToId('${obj.id}', false, 'profile'); }" style="position: relative; display: flex; align-items: center; background: var(--color-bg-body); border-radius: 8px; text-decoration: none; color: var(--color-text-main); font-size: 14px; transition: opacity 0.2s; width: 100%; overflow: hidden; border: 1px solid var(--color-border);" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                        <div style="position: absolute; top: 0; left: 0; height: 100%; width: ${Math.max(2, widthPercent)}%; background: var(--color-bg-card); z-index: 0; border-right: 2px solid var(--color-primary); opacity: 0.8; transition: width 0.5s ease-in-out;"></div>
                        <div style="position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; padding: 6px 16px 6px 6px; width: 100%;">
                            ${avatarHtml}
                            <span style="font-weight: 500; white-space: nowrap;">${shortName}</span>
                            <span style="margin-left: auto; color: var(--color-text-meta); font-size: 12px; font-weight: bold; background: var(--color-bg-body); padding: 2px 8px; border-radius: 12px; z-index: 2;">${displayAge}</span>
                        </div>
                    </a>
                </div>`;
			};
			
            let rowsHtml = '';
            let avgLineInserted = false;
            
            sortedSpans.forEach(s => {
                let currentMetric = hasExact ? (s.exactDays !== null && s.exactDays !== undefined ? s.exactDays : (s.age * 365.25)) : s.age;
                let targetAvg = hasExact ? avgDays : avgAge;

                if (!avgLineInserted && currentMetric < targetAvg) {
                    let displayAvg = targetAvg;
                    if (hasExact) {
                        let y = Math.floor(targetAvg / 365.25);
                        let d = Math.round(targetAvg % 365.25);
                        displayAvg = y + " р. " + d + " дн.";
                    } else {
                        displayAvg = targetAvg + " р.";
                    }
                    rowsHtml += `<div style="display: flex; align-items: center; margin: 16px 0; color: var(--color-text-muted); font-size: 13px; width: 100%;">
                        Середній вік: ${displayAvg}
                        <div style="flex-grow: 1; height: 1px; border-bottom: 1px dashed var(--color-border); margin-left: 12px; opacity: 0.5;"></div>
                    </div>`;
                    avgLineInserted = true;
                }
                rowsHtml += makeTag(s);
            });
            
            if (!avgLineInserted) {
                    let displayAvg = hasExact ? avgDays : avgAge;
                    if (hasExact) {
                        let y = Math.floor(avgDays / 365.25);
                        let d = Math.round(avgDays % 365.25);
                        displayAvg = y + " р. " + d + " дн.";
                    } else {
                        displayAvg = avgAge + " р.";
                    }
                 rowsHtml += `<div style="display: flex; align-items: center; margin: 16px 0; color: var(--color-text-muted); font-size: 13px; width: 100%;">
                        Середній вік: ${displayAvg}
                        <div style="flex-grow: 1; height: 1px; border-bottom: 1px dashed var(--color-border); margin-left: 12px; opacity: 0.5;"></div>
                    </div>`;
            }
            
            return `
                <div style="width: 100%;">
                    <div class="analytics-stat-title" style="margin-bottom: 16px; font-weight: 600; font-size: 16px; color: var(--color-text-main);">${title}</div>
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
        
        const createSortRenderer = (container, dataMap, orderArray, includeNicknames = false) => {
            if (!container) return () => {};
            return (sortMode) => {
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
                    return `
                        <li style="list-style: none; display: inline-flex; flex-direction: column; background: var(--color-bg-card); border: 1px solid var(--color-border-light); border-radius: 8px; padding: 4px 12px; font-size: 14px; color: var(--color-text-main);">
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <span>${s[0]}</span>
                                <span style="background: var(--color-bg-body); padding: 2px 6px; border-radius: 12px; font-size: 12px; color: var(--color-text-muted);">${s[1]}</span>
                            </div>
                            ${hasNicknames ? `<div style="font-size: 12px; color: var(--color-text-muted); margin-top: 4px; padding-top: 4px; border-top: 1px dashed var(--color-border-light);">${Object.keys(nicknamesMap[s[0]]).join(', ')}</div>` : ''}
                        </li>
                    `;
                }).join("");
            };
        };

        const renderNamesM = createSortRenderer(this.containerNamesM, namesM, namesMOrder, false);
        const renderNamesF = createSortRenderer(this.containerNamesF, namesF, namesFOrder, false);
        const renderSurnames = createSortRenderer(document.getElementById("analytics-surnames"), surnamesMap, surnamesOrder, true);

        // Initial render: sort by appearance (за згадкою)
        renderNamesM('appearance');
        renderNamesF('appearance');
        renderSurnames('frequency');

        // Bind global names sort buttons
        if (this.containerNamesM) {
            const namesSection = this.containerNamesM.closest('.analytics-section-content');
            if (namesSection) {
                const updateSort = (mode) => {
                    renderNamesM(mode);
                    renderNamesF(mode);
                };
                
                // Bind all buttons with these classes globally or within document
                document.querySelectorAll('.btn-sort-freq').forEach(b => b.onclick = (e) => { e.preventDefault(); updateSort('frequency'); if (b.closest('.popup-overlay')) b.closest('.popup-overlay').style.display='none'; });
                document.querySelectorAll('.btn-sort-alpha').forEach(b => b.onclick = (e) => { e.preventDefault(); updateSort('alphabet'); if (b.closest('.popup-overlay')) b.closest('.popup-overlay').style.display='none'; });
                document.querySelectorAll('.btn-sort-app').forEach(b => b.onclick = (e) => { e.preventDefault(); updateSort('appearance'); if (b.closest('.popup-overlay')) b.closest('.popup-overlay').style.display='none'; });
            }
        }
        
        
                // Surnames sorting bindings
                document.querySelectorAll('.btn-sort-freq-s').forEach(b => b.onclick = (e) => { e.preventDefault(); renderSurnames('frequency'); if (b.closest('.popup-overlay')) b.closest('.popup-overlay').style.display='none'; });
                document.querySelectorAll('.btn-sort-alpha-s').forEach(b => b.onclick = (e) => { e.preventDefault(); renderSurnames('alphabet'); if (b.closest('.popup-overlay')) b.closest('.popup-overlay').style.display='none'; });
                document.querySelectorAll('.btn-sort-app-s').forEach(b => b.onclick = (e) => { e.preventDefault(); renderSurnames('appearance'); if (b.closest('.popup-overlay')) b.closest('.popup-overlay').style.display='none'; });



        console.log("namesM length:", Object.keys(namesM).length); const uniqueNamesMCount = Object.keys(namesM).length;
        const uniqueNamesFCount = Object.keys(namesF).length;
        const uniqueSurnamesCount = Object.keys(surnamesMap).length;
        const uniquePlacesCount = Object.keys(placesCount).length;
        
        let coatsDataCount = 0;
        let deathsMapCount = 0;
        
        try {
            const coatsSet = new Set();
            if (this.engine && this.engine.db && this.engine.db.names) {
                this.engine.db.names.forEach(n => {
                    const coat = n[COLUMNS.names?.coatOfArms || "coat_of_arms"];
                    if (coat && String(coat).trim() !== "") {
                        coatsSet.add(String(coat).trim());
                    }
                });
            }
            coatsDataCount = coatsSet.size;
        } catch(e) {}
        
        try {
            const deathsSet = new Set();
            if (this.engine && this.engine.db && this.engine.db.death) {
                this.engine.db.death.forEach(d => {
                    const cause = d[COLUMNS.death?.cause || "cause"];
                    if (cause && String(cause).trim() !== "") {
                        deathsSet.add(String(cause).trim().toLowerCase());
                    }
                });
            }
            deathsMapCount = deathsSet.size;
        } catch(e) {}

        const uniqueDeathsCount = deathsMapCount;
        const uniqueCoatsCount = coatsDataCount;


        
        const confMax = lifespansConfirmed.length > 0 ? Math.max(...lifespansConfirmed.map(s => s.age)) : 0;
        const approxMax = lifespansApprox.length > 0 ? Math.max(...lifespansApprox.map(s => s.age)) : 0;
        let html = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px;">
                    <!-- Загальна кількість -->
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px; display: flex; flex-direction: column;">
                        <div style="color: var(--color-text-muted); font-size: 14px; margin-bottom: 12px;">Загальна кількість</div>
                        <div style="font-size: 32px; font-weight: bold; color: var(--color-primary); margin-bottom: 8px;">${totalPeople}</div>
                        <div style="color: var(--color-text-meta); font-size: 14px; margin-top: auto;">Чоловіків: ${maleCount} / Жінок: ${femaleCount}</div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
                    <a href="#" class="analytics-nav-btn" data-target="analytics-lifespan" data-title="Тривалість життя" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px 16px; color: var(--color-text-main); text-decoration: none; transition: all 0.2s;">
                        <div style="font-size: 18px; font-weight: 600; text-align: center;">Тривалість життя</div>
                        <div style="font-size: 13px; color: var(--color-text-meta);">макс: ${confMax > 0 ? confMax : approxMax} р.</div>
                    </a>

                    <a href="#" class="analytics-nav-btn" data-target="analytics-names" data-title="Імена" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px 16px; color: var(--color-text-main); text-decoration: none; transition: all 0.2s;">
                        <div style="font-size: 18px; font-weight: 600;">Імена</div>
                        <div style="font-size: 13px; color: var(--color-text-meta);">унікальних: ${uniqueNamesMCount + uniqueNamesFCount}</div>
                    </a>
                    
                    <a href="#" class="analytics-nav-btn" data-target="analytics-surnames" data-title="Прізвища" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px 16px; color: var(--color-text-main); text-decoration: none; transition: all 0.2s;">
                        <div style="font-size: 18px; font-weight: 600;">Прізвища</div>
                        <div style="font-size: 13px; color: var(--color-text-meta);">унікальних: ${uniqueSurnamesCount}</div>
                    </a>
                    
                    <a href="#" class="analytics-nav-btn" data-target="analytics-places" data-title="Населені пункти" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px 16px; color: var(--color-text-main); text-decoration: none; transition: all 0.2s;">
                        <div style="font-size: 18px; font-weight: 600; text-align: center;">Населені пункти</div>
                        <div style="font-size: 13px; color: var(--color-text-meta);">унікальних: ${uniquePlacesCount}</div>
                    </a>
                    
                    <a href="#" class="analytics-nav-btn" data-target="analytics-deaths" data-title="Причини смерті" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px 16px; color: var(--color-text-main); text-decoration: none; transition: all 0.2s;">
                        <div style="font-size: 18px; font-weight: 600; text-align: center;">Причини смерті</div>
                        <div style="font-size: 13px; color: var(--color-text-meta);">унікальних: ${uniqueDeathsCount}</div>
                    </a>

                    <a href="#" class="analytics-nav-btn" data-target="analytics-events" data-title="Календар подій" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px 16px; color: var(--color-text-main); text-decoration: none; transition: all 0.2s;">
                        <div style="font-size: 18px; font-weight: 600; text-align: center;">Календар подій</div>
                        <div style="font-size: 13px; color: var(--color-text-meta);">події</div>
                    </a>
                    
                    <a href="#" class="analytics-nav-btn" data-target="analytics-coats" data-title="Герби" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px 16px; color: var(--color-text-main); text-decoration: none; transition: all 0.2s;">
                        <div style="font-size: 18px; font-weight: 600;">Герби</div>
                        <div style="font-size: 13px; color: var(--color-text-meta);">унікальних: ${uniqueCoatsCount}</div>
                    </a>
                </div>
            `;
            this.containerSummary.innerHTML = html;
            
             const navBtns = this.containerSummary.querySelectorAll('.analytics-nav-btn');
             const detailedView = document.getElementById("analytics-detailed-view");
             const btnBack = document.getElementById("btn-back-to-summary");
             const titleView = document.getElementById("detailed-view-title");

             navBtns.forEach(btn => {
                 btn.addEventListener("click", (e) => {
                     e.preventDefault();
                     const targetId = btn.getAttribute("data-target");
                     const title = btn.getAttribute("data-title");
                     
                     this.containerSummary.style.display = "none";
                     if (detailedView) {
                         detailedView.style.display = "flex";
                         
                         const sections = detailedView.querySelectorAll('.analytics-section');
                         sections.forEach(sec => sec.style.display = 'none');
                         
                         const targetEl = document.getElementById(targetId);
                         if (targetEl) {
                             const parentSec = targetEl.closest('.analytics-section');
                             if (parentSec) {
                                 parentSec.style.display = 'block';
                                 const h4 = parentSec.querySelector('h4');
                                 if (h4) h4.style.display = 'none'; // hide the h4 because we show it in the header
                             }
                         }

                         if (titleView) titleView.textContent = title;
                     }
                 });
             });

             if (btnBack && !btnBack.dataset.init) {
                 btnBack.dataset.init = "true";
                 btnBack.addEventListener("click", () => {
                     if (detailedView) detailedView.style.display = "none";
                     this.containerSummary.style.display = "flex";
                 });
             }



		
        const placeNameMap = {};
        if (this.engine && this.engine.db && this.engine.db.places) {
            this.engine.db.places.forEach(p => {
                const idCol = COLUMNS.places?.id || "place_id";
                const nameCol = COLUMNS.places?.nameCurrent || "name_current";
                const histCol = COLUMNS.places?.nameHist || "name_hist";
                placeNameMap[p[idCol]] = p[nameCol] || p[histCol] || "Невідомо";
            });
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
                    <span>${placeNameMap[p[0]] || p[0]}</span>
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
