import { COLUMNS } from "../../core/dbSchema.js";
import { i18n } from "../../core/i18n.js";
import { calculateAgeAtDeath, convertJulianToGregorian } from "../../utils/dateUtils.js";
import { resolveCoatUrl } from "../../utils/coatUtils.js";
import { renderPersonTile } from "../ui/shared/personTile.js";
import { findPersonDetails } from "../../utils/personUtils.js";
import { escapeHtml } from "../../utils/helpers.js";

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
        console.log("AnalyticsManager render() called with mode:", window.app?.managers?.lineage?.logic?.mode);
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
                
                const icon = document.createElement("i");
                icon.className = "ri-arrow-down-s-line analytics-mobile-accordion-icon";
                h4.appendChild(icon);

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
        if (window.app && window.app.managers && window.app.managers.lineage && window.app.managers.lineage.logic) {
            visibleIds = new Set(window.app.managers.lineage.logic.queue.map(String));
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
		const placesOrder = [];

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
        const getPersonName = (pid, eventType) => {
            if (!pid) return "Невідомо";
            const details = findPersonDetails(pid, this.engine);
            if (!details || (!details.name && !details.surname)) return "Невідомо";
            
            let s = details.surname || "";
            let n = details.name || "";
            let pat = details.patronymic || "";
            
            const isFem = details.gender === "f" || details.gender === "ж";
            if (["birth", "baptism", "marriage", "народження", "хрещення", "шлюб"].includes(eventType)) {
                if (isFem) {
                    s = details.maidenName ? details.maidenName : "";
                }
            } else if (["death", "funeral", "смерть", "поховання"].includes(eventType)) {
                if (isFem) {
                    if (details.marriedName) {
                        const mSurnames = String(details.marriedName).split(/[,;]/).map(x => x.trim()).filter(Boolean);
                        if (mSurnames.length > 0) {
                            s = mSurnames[mSurnames.length - 1];
                        } else {
                            s = details.maidenName ? details.maidenName : "";
                        }
                    } else {
                        s = details.maidenName ? details.maidenName : "";
                    }
                }
            } else {
                if (isFem) {
                    s = details.maidenName ? details.maidenName : "";
                }
            }
            
            const fullName = [s, n, pat].filter(Boolean).join(" ");
            return `<a href="?id=${encodeURIComponent(pid)}&view=profile" class="js-stop-prop analytics-person-link" style="color: var(--color-primary); text-decoration: none;">${escapeHtml(fullName)}</a>`;
        };

        const EVENT_ORDER = ["народження", "хрещення", "шлюб", "смерть", "поховання", "згадки в індексах пращурів", "походження"];
        const getEventSortIndex = (eventName) => {
            const idx = EVENT_ORDER.indexOf(eventName);
            return idx !== -1 ? idx : 999;
        };

        const personRank = {};
        if (this.engine.db.basic) {
            this.engine.db.basic.forEach((p, idx) => {
                const pid = p[COLUMNS.basic?.id || "person_id"];
                if (pid) personRank[String(pid)] = idx;
            });
        }
        if (this.engine.db.familyList) {
            this.engine.db.familyList.forEach((f, idx) => {
                const pid = f[COLUMNS.familyList?.id || "fam_id"];
                if (pid && personRank[String(pid)] === undefined) personRank[String(pid)] = 1000000 + idx;
            });
        }
        if (this.engine.db.participants) {
            this.engine.db.participants.forEach((p, idx) => {
                const pid = p[COLUMNS.participants?.id || "p_id"];
                if (pid && personRank[String(pid)] === undefined) personRank[String(pid)] = 2000000 + idx;
            });
        }

        const placeFirstAppearance = {};

        const countPlace = (placeId, eventType, peopleList = [], personIds = []) => {
            if (placeId && String(placeId).trim() !== "") {
                const pName = String(placeId).trim();
                if (!placesCount[pName]) { 
                    placesCount[pName] = { total: 0, events: {}, peopleLists: {} }; 
                    placesOrder.push(pName); 
                    placeFirstAppearance[pName] = { pRank: Infinity, eRank: Infinity };
                }
                
                const eRank = getEventSortIndex(eventType);
                personIds.forEach(pid => {
                    const strPid = String(pid);
                    let pRank = personRank[strPid];
                    if (pRank === undefined) {
                        const num = parseInt(strPid, 10);
                        pRank = isNaN(num) ? 3000000 : 3000000 + num;
                    }
                    if (pRank < placeFirstAppearance[pName].pRank) {
                        placeFirstAppearance[pName].pRank = pRank;
                        placeFirstAppearance[pName].eRank = eRank;
                    } else if (pRank === placeFirstAppearance[pName].pRank) {
                        if (eRank < placeFirstAppearance[pName].eRank) {
                            placeFirstAppearance[pName].eRank = eRank;
                        }
                    }
                });

                if (!placesCount[pName].peopleLists[eventType]) {
                    placesCount[pName].peopleLists[eventType] = new Set();
                }
                const oldSize = placesCount[pName].peopleLists[eventType].size;
                peopleList.forEach(p => placesCount[pName].peopleLists[eventType].add(p));
                const newSize = placesCount[pName].peopleLists[eventType].size;
                placesCount[pName].total += (newSize - oldSize);
                placesCount[pName].events[eventType] = newSize;
            }
        };

        if (this.engine.db.birth) {
            this.engine.db.birth.forEach(b => {
                const pid = b[COLUMNS.birth?.personId || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;
                countPlace(b[COLUMNS.birth?.placeId || "place_id"], "народження", [getPersonName(pid, "народження")], [pid]);
            });
        }
        if (this.engine.db.death) {
            this.engine.db.death.forEach(d => {
                const pid = d[COLUMNS.death?.personId || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;
                countPlace(d[COLUMNS.death?.placeId || "place_id"], "смерть", [getPersonName(pid, "смерть")], [pid]);
            });
        }
        if (this.engine.db.marriage) {
            this.engine.db.marriage.forEach(m => {
                const hid = m[COLUMNS.marriage?.personId || "person_id"];
                const wid = m[COLUMNS.marriage?.spouseId || "spouse_id"];
                if (visibleIds && !visibleIds.has(String(hid)) && !visibleIds.has(String(wid))) return;
                const hName = getPersonName(hid, "шлюб");
                const wName = getPersonName(wid, "шлюб");
                const couple = (hid || wid) ? `${hName} та ${wName}` : "Невідомо";
                countPlace(m[COLUMNS.marriage?.placeId || "place_id"], "шлюб", [couple], [hid, wid]);
            });
        }
        if (this.engine.db.baptism) {
            this.engine.db.baptism.forEach(m => {
                const pid = m[COLUMNS.baptism?.personId || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;
                countPlace(m[COLUMNS.baptism?.placeId || "place_id"], "хрещення", [getPersonName(pid, "хрещення")], [pid]);
            });
        }
        if (this.engine.db.funeral) {
            this.engine.db.funeral.forEach(m => {
                const pid = m[COLUMNS.funeral?.personId || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;
                countPlace(m[COLUMNS.funeral?.placeId || "place_id"], "поховання", [getPersonName(pid, "поховання")], [pid]);
            });
        }
        if (this.engine.db.familyList) {
            this.engine.db.familyList.forEach(f => {
                const pid = f[COLUMNS.familyList?.id || "fam_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;
                const placeId = f[COLUMNS.familyList?.birthPlace || "fam_birth_place"];
                if (placeId && String(placeId).trim() !== "") {
                    const pName = String(placeId).trim();
                    const personName = getPersonName(pid);
                    let alreadyExists = false;
                    if (placesCount[pName]) {
                        for (const eventName of Object.keys(placesCount[pName].peopleLists)) {
                            if (eventName !== "згадки в індексах пращурів" && placesCount[pName].peopleLists[eventName].has(personName)) {
                                alreadyExists = true; break;
                            }
                        }
                    }
                    if (!alreadyExists) countPlace(placeId, "згадки в індексах пращурів", [personName], [pid]);
                }
            });
        }
        if (this.engine.db.participants) {
            this.engine.db.participants.forEach(p => {
                const pid = p[COLUMNS.participants?.id || "p_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;
                const placeId = p[COLUMNS.participants?.birthPlace || "p_birth_place"];
                if (placeId && String(placeId).trim() !== "") {
                    const pName = String(placeId).trim();
                    const personName = getPersonName(pid);
                    let alreadyExists = false;
                    if (placesCount[pName]) {
                        for (const eventName of Object.keys(placesCount[pName].peopleLists)) {
                            if (eventName !== "згадки в індексах пращурів" && placesCount[pName].peopleLists[eventName].has(personName)) {
                                alreadyExists = true; break;
                            }
                        }
                    }
                    if (!alreadyExists) countPlace(placeId, "згадки в індексах пращурів", [personName], [pid]);
                }
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
                    <div class="analytics-stat-title" style=" font-weight: 600; font-size: 16px; color: var(--color-text-main);">${title}</div>
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
        let activeNamesSort = 'appearance';
        document.querySelectorAll('.btn-sort-app, .btn-sort-alpha, .btn-sort-freq').forEach(btn => {
            if (btn.style.background === 'var(--color-primary)') {
                if (btn.classList.contains('btn-sort-app')) activeNamesSort = 'appearance';
                else if (btn.classList.contains('btn-sort-alpha')) activeNamesSort = 'alphabet';
                else if (btn.classList.contains('btn-sort-freq')) activeNamesSort = 'frequency';
            }
        });
        
        let activeSurnamesSort = 'appearance'; // Assuming this was intended, although later it says appearance
        document.querySelectorAll('.btn-sort-app-s, .btn-sort-alpha-s, .btn-sort-freq-s').forEach(btn => {
            if (btn.style.background === 'var(--color-primary)') {
                if (btn.classList.contains('btn-sort-app-s')) activeSurnamesSort = 'appearance';
                else if (btn.classList.contains('btn-sort-alpha-s')) activeSurnamesSort = 'alphabet';
                else if (btn.classList.contains('btn-sort-freq-s')) activeSurnamesSort = 'frequency';
            }
        });

        renderNamesM(activeNamesSort);
        renderNamesF(activeNamesSort);
        renderSurnames(activeSurnamesSort);

        // Bind global names sort buttons
        if (this.containerNamesM) {
            const namesSection = this.containerNamesM.closest('.analytics-section-content');
            if (namesSection) {
                const updateNamesActiveBtn = (mode) => {
                    document.querySelectorAll('.btn-sort-app, .btn-sort-alpha, .btn-sort-freq').forEach(btn => {
                        let btnMode = '';
                        if (btn.classList.contains('btn-sort-app')) btnMode = 'appearance';
                        else if (btn.classList.contains('btn-sort-alpha')) btnMode = 'alphabet';
                        else if (btn.classList.contains('btn-sort-freq')) btnMode = 'frequency';
                        
                        if (btnMode === mode) {
                            btn.style.background = 'var(--color-primary)';
                            btn.style.color = 'white';
                            btn.style.borderColor = 'var(--color-primary)';
                        } else {
                            btn.style.background = 'transparent';
                            btn.style.color = 'var(--color-text-main)';
                            btn.style.borderColor = 'var(--color-border)';
                        }
                    });
                };

                const updateSort = (mode) => {
                    renderNamesM(mode);
                    renderNamesF(mode);
                    updateNamesActiveBtn(mode);
                };
                
                updateNamesActiveBtn(activeNamesSort);

                // Bind all buttons with these classes globally or within document
                document.querySelectorAll('.btn-sort-freq').forEach(b => b.onclick = (e) => { e.preventDefault(); updateSort('frequency'); if (b.closest('.popup-overlay')) b.closest('.popup-overlay').classList.remove('show'); });
                document.querySelectorAll('.btn-sort-alpha').forEach(b => b.onclick = (e) => { e.preventDefault(); updateSort('alphabet'); if (b.closest('.popup-overlay')) b.closest('.popup-overlay').classList.remove('show'); });
                document.querySelectorAll('.btn-sort-app').forEach(b => b.onclick = (e) => { e.preventDefault(); updateSort('appearance'); if (b.closest('.popup-overlay')) b.closest('.popup-overlay').classList.remove('show'); });
            }
        }
        
        const updateSurnamesActiveBtn = (mode) => {
            document.querySelectorAll('.btn-sort-app-s, .btn-sort-alpha-s, .btn-sort-freq-s').forEach(btn => {
                let btnMode = '';
                if (btn.classList.contains('btn-sort-app-s')) btnMode = 'appearance';
                else if (btn.classList.contains('btn-sort-alpha-s')) btnMode = 'alphabet';
                else if (btn.classList.contains('btn-sort-freq-s')) btnMode = 'frequency';
                
                if (btnMode === mode) {
                    btn.style.background = 'var(--color-primary)';
                    btn.style.color = 'white';
                    btn.style.borderColor = 'var(--color-primary)';
                } else {
                    btn.style.background = 'transparent';
                    btn.style.color = 'var(--color-text-main)';
                    btn.style.borderColor = 'var(--color-border)';
                }
            });
        };

        const updateSurnamesSort = (mode) => {
            renderSurnames(mode);
            updateSurnamesActiveBtn(mode);
        };
        
        updateSurnamesActiveBtn(activeSurnamesSort);

        // Surnames sorting bindings
        document.querySelectorAll('.btn-sort-freq-s').forEach(b => b.onclick = (e) => { e.preventDefault(); updateSurnamesSort('frequency'); if (b.closest('.popup-overlay')) b.closest('.popup-overlay').classList.remove('show'); });
        document.querySelectorAll('.btn-sort-alpha-s').forEach(b => b.onclick = (e) => { e.preventDefault(); updateSurnamesSort('alphabet'); if (b.closest('.popup-overlay')) b.closest('.popup-overlay').classList.remove('show'); });
        document.querySelectorAll('.btn-sort-app-s').forEach(b => b.onclick = (e) => { e.preventDefault(); updateSurnamesSort('appearance'); if (b.closest('.popup-overlay')) b.closest('.popup-overlay').classList.remove('show'); });



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
                    const pid = d[COLUMNS.death?.personId || "person_id"];
                    if (visibleIds && !visibleIds.has(String(pid))) return;

                    const cause = d[COLUMNS.death?.cause || "d_cause"];
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
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; ">
                    <!-- Загальна кількість -->
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
                        <div style="color: var(--color-text-muted); font-size: 14px; margin-bottom: 12px;">Загальна кількість</div>
                        <div style="font-size: 32px; font-weight: bold; color: var(--color-primary); margin-bottom: 8px;">${totalPeople}</div>
                        <div style="color: var(--color-text-meta); font-size: 14px; margin-top: 12px;">Чоловіків: ${maleCount} / Жінок: ${femaleCount}</div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
                    <a href="#" class="analytics-nav-btn" data-target="analytics-lifespan" data-title="Тривалість життя" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px 16px; color: var(--color-text-main); text-decoration: none; transition: all 0.2s;">
                        <div style="font-size: 18px; font-weight: 600; text-align: center;">Тривалість життя</div>
                        
                    </a>

                    <a href="#" class="analytics-nav-btn" data-target="analytics-names" data-title="Імена" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px 16px; color: var(--color-text-main); text-decoration: none; transition: all 0.2s;">
                        <div style="font-size: 18px; font-weight: 600;">Імена</div>
                        
                    </a>
                    
                    <a href="#" class="analytics-nav-btn" data-target="analytics-surnames" data-title="Прізвища" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px 16px; color: var(--color-text-main); text-decoration: none; transition: all 0.2s;">
                        <div style="font-size: 18px; font-weight: 600;">Прізвища</div>
                        
                    </a>
                    
                    <a href="#" class="analytics-nav-btn" data-target="analytics-places" data-title="Населені пункти" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px 16px; color: var(--color-text-main); text-decoration: none; transition: all 0.2s;">
                        <div style="font-size: 18px; font-weight: 600; text-align: center;">Населені пункти</div>
                        
                    </a>
                    
                    <a href="#" class="analytics-nav-btn" data-target="analytics-deaths" data-title="Причини смерті" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px 16px; color: var(--color-text-main); text-decoration: none; transition: all 0.2s;">
                        <div style="font-size: 18px; font-weight: 600; text-align: center;">Причини смерті</div>
                        
                    </a>

                    <a href="#" class="analytics-nav-btn" data-target="analytics-events" data-title="Календар подій" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px 16px; color: var(--color-text-main); text-decoration: none; transition: all 0.2s;">
                        <div style="font-size: 18px; font-weight: 600; text-align: center;">Календар подій</div>
                        
                    </a>
                    
                    <a href="#" class="analytics-nav-btn" data-target="analytics-coats" data-title="Герби" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px 16px; color: var(--color-text-main); text-decoration: none; transition: all 0.2s;">
                        <div style="font-size: 18px; font-weight: 600;">Герби</div>
                        
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
                                 parentSec.classList.add('accordion-open');
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
        const getEventWord = (count) => {
            const lastDigit = count % 10;
            const lastTwo = count % 100;
            if (lastTwo >= 11 && lastTwo <= 19) return "подій";
            if (lastDigit === 1) return "подія";
            if (lastDigit >= 2 && lastDigit <= 4) return "події";
            return "подій";
        };

        const renderPlaces = (sortMode) => {
            let sortedEntries = [];
            if (sortMode === 'appearance') {
                sortedEntries = [...placesOrder].sort((a, b) => {
                    const aApp = placeFirstAppearance[a];
                    const bApp = placeFirstAppearance[b];
                    if (aApp.pRank !== bApp.pRank) return aApp.pRank - bApp.pRank;
                    return aApp.eRank - bApp.eRank;
                }).map(k => [k, placesCount[k]]);
            } else if (sortMode === 'alphabet_az') {
                const stripPrefix = (name) => name.replace(/^(м\.|с\.|сел\.)\s*/i, '').trim();
                sortedEntries = Object.entries(placesCount).sort((a, b) => {
                    const nameA = stripPrefix(placeNameMap[a[0]] || a[0]);
                    const nameB = stripPrefix(placeNameMap[b[0]] || b[0]);
                    return nameA.localeCompare(nameB, 'uk');
                });
            } else if (sortMode === 'alphabet_za') {
                const stripPrefix = (name) => name.replace(/^(м\.|с\.|сел\.)\s*/i, '').trim();
                sortedEntries = Object.entries(placesCount).sort((a, b) => {
                    const nameA = stripPrefix(placeNameMap[a[0]] || a[0]);
                    const nameB = stripPrefix(placeNameMap[b[0]] || b[0]);
                    return nameB.localeCompare(nameA, 'uk');
                });
            } else {
                sortedEntries = Object.entries(placesCount).sort((a, b) => b[1].total - a[1].total);
            }

            
            this.containerPlaces.style.display = "block";
            
            if (sortedEntries.length === 0) {
                this.containerPlaces.innerHTML = `<li style="list-style: none; color: var(--color-text-muted); padding: 12px; text-align: center; background: var(--color-bg-card); border-radius: 8px;">Немає даних про населені пункти</li>`;
                return;
            }

            let tocLinksHtml = "";
            let html = "";
            
            sortedEntries.forEach((p, idx) => {
                const total = p[1].total;
                const eventsObj = p[1].events;
                const placeName = placeNameMap[p[0]] || p[0];
                const blockId = `event-place-${idx}`;
                
                tocLinksHtml += `<li><a href="#${blockId}" class="profile-toc-link js-scroll-to">${placeName}</a></li>`;
                
                html += `
                <li id="${blockId}" class="analytics-place-item" style="list-style: none; margin-top: 24px; margin-bottom: 12px; padding-bottom: 4px;">
                    <div class="analytics-place-header" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; border-bottom: 2px solid var(--color-border); padding-bottom: 8px;">
                        <h3 style="margin: 0; font-size: 20px; color: var(--color-text-main);">${placeName} <span style="font-size: 14px; font-weight: normal; color: var(--color-text-muted); margin-left: 8px;">(${total} ${getEventWord(total)})</span></h3>
                        <i class="ri-arrow-down-s-line analytics-place-icon analytics-mobile-only" style="transition: transform 0.3s; color: var(--color-text-main); font-size: 24px; transform: rotate(180deg);"></i>
                    </div>
                    <div class="analytics-place-body" style="display: block; padding-top: 8px;">
                        <ul style="list-style: none; padding: 0; margin: 0;">
                            ${(() => {
                                const EVENT_ORDER = ["народження", "хрещення", "шлюб", "смерть", "поховання", "згадки в індексах пращурів", "походження"];
                                const getEventSortIndex = (eventName) => {
                                    const idx = EVENT_ORDER.indexOf(eventName);
                                    return idx !== -1 ? idx : 999;
                                };
                                const sortedEvents = Object.entries(eventsObj).sort((a, b) => getEventSortIndex(a[0]) - getEventSortIndex(b[0]));
                                return sortedEvents.map(e => {
                                    const evtName = e[0];
                                    const evtCount = e[1];
                                    const peopleList = Array.from(p[1].peopleLists?.[evtName] || []);
                                    const peopleHtml = peopleList.length > 0 
                                        ? `<ul style="list-style: none; padding-left: 0; margin: 0; display: flex; flex-direction: column; gap: 4px;">
                                            ${peopleList.map(personName => `<li style="display: flex; align-items: center; padding: 6px 12px; background: var(--color-bg-card); border: 1px solid var(--color-border-light); border-radius: 6px;"><div style="font-size: 15px; color: var(--color-text-main);">${personName}</div></li>`).join("")}
                                          </ul>` 
                                        : "";
                                
                                return `
                                <li style="list-style: none; margin-top: 8px; margin-bottom: 4px; margin-left: 12px;">
                                    <div style="font-size: 14px; font-weight: 600; color: var(--color-text-muted); margin-bottom: 4px; text-transform: capitalize;">${evtName}</div>
                                    ${peopleHtml}
                                </li>
                                `;
                                }).join("");
                            })()}
                        </ul>
                    </div>
                </li>
                `;
            });

            this.containerPlaces.innerHTML = `
                <div class="events-layout-with-sidebar" style="position: relative; width: 100%;">
                    <aside class="events-sidebar-desktop" style="display: none;">
                        <div>
                            <div class="profile-toc-container">
                                <h3 class="profile-toc-title">Населені пункти</h3>
                                <ul class="profile-toc-list">
                                    ${tocLinksHtml}
                                </ul>
                            </div>
                        </div>
                    </aside>
                    <div class="events-body-blocks">
                        <ul class="analytics-list-none" style="padding: 0; margin: 0;">
                            ${html}
                        </ul>
                    </div>
                </div>
            `;
            
            const placeItems = this.containerPlaces.querySelectorAll('.analytics-place-item');
            placeItems.forEach(item => {
                const header = item.querySelector('.analytics-place-header');
                const body = item.querySelector('.analytics-place-body');
                const icon = item.querySelector('.analytics-place-icon');
                
                const isDesktop = window.innerWidth >= 1200;
                if (!isDesktop) {
                    body.style.display = 'none';
                    if (icon) icon.style.transform = 'rotate(0deg)';
                }
                
                header.addEventListener('click', () => {
                    const isOpen = body.style.display === 'block';
                    body.style.display = isOpen ? 'none' : 'block';
                    if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
                });
            });
            this.containerPlaces.querySelectorAll('.js-scroll-to').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetId = link.getAttribute('href').substring(1);
                    const targetEl = document.getElementById(targetId);
                    if (targetEl) {
                        const body = targetEl.querySelector('.analytics-place-body');
                        const icon = targetEl.querySelector('.analytics-place-icon');
                        if (body && body.style.display === 'none') {
                            body.style.display = 'block';
                            if (icon) icon.style.transform = 'rotate(180deg)';
                        }
                        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            });

        };

        const placesSectionContent = this.containerPlaces.closest('.analytics-section-content');
        let controls = placesSectionContent ? placesSectionContent.querySelector('.places-sort-controls') : null;
        if (placesSectionContent && !controls) {
            const controlsHtml = `
                <div class="places-sort-controls analytics-sort-controls">
                    <div class="analytics-sort-desktop" style="display: flex; gap: 8px;  flex-wrap: wrap;">
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="appearance">За згадкою</button>
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="frequency">За популярністю</button>
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="alphabet_az">А - Я</button>
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="alphabet_za">Я - А</button>
                    </div>
                    <div class="analytics-sort-mobile" style="display: none; ">
                        <button class="btn btn-sm btn-outline w-full" id="btn-mobile-sort-places" onclick="document.getElementById('mobile-sort-popup-places').classList.add('show')">
                            <i class="ri-sort-desc"></i> Сортувати населені пункти
                        </button>
                    </div>
                    <div id="mobile-sort-popup-places" class="popup-overlay" style="z-index: 9999;" onclick="if(event.target===this) this.classList.remove('show')">
                        <div class="popup-content" style="max-width: 300px; width: 90%; margin: auto; padding: 24px; border-radius: 12px; background: var(--color-bg-card); display: flex; flex-direction: column; gap: 12px;">
                            <h3 style="margin-top: 0; margin-bottom: 8px; font-size: 18px;">Сортувати за</h3>
                            <button class="btn btn-outline btn-sort-places" data-sort="appearance" onclick="document.getElementById('mobile-sort-popup-places').classList.remove('show')">За згадкою</button>
                            <button class="btn btn-outline btn-sort-places" data-sort="frequency" onclick="document.getElementById('mobile-sort-popup-places').classList.remove('show')">За популярністю</button>
                            <button class="btn btn-outline btn-sort-places" data-sort="alphabet_az" onclick="document.getElementById('mobile-sort-popup-places').classList.remove('show')">А - Я</button>
                            <button class="btn btn-outline btn-sort-places" data-sort="alphabet_za" onclick="document.getElementById('mobile-sort-popup-places').classList.remove('show')">Я - А</button>
                            <button class="btn mt-2" style="background: var(--color-bg-hover); color: var(--color-text-main); border: 1px solid var(--color-border);" onclick="document.getElementById('mobile-sort-popup-places').classList.remove('show')">Закрити</button>
                        </div>
                    </div>
                </div>
            `;
            placesSectionContent.insertAdjacentHTML('afterbegin', controlsHtml);
            controls = placesSectionContent.querySelector('.places-sort-controls');
        }

        let activeSortMode = 'appearance';
        if (controls) {
            let hasActive = false;
            controls.querySelectorAll('.btn-sort-places').forEach(btn => {
                if (btn.style.background === 'var(--color-primary)') {
                    activeSortMode = btn.dataset.sort;
                    hasActive = true;
                }
            });
            if (!hasActive) activeSortMode = 'appearance';
        }

        renderPlaces(activeSortMode);

        if (placesSectionContent) {
            const updatePlacesActiveBtn = (mode) => {
                placesSectionContent.querySelectorAll('.btn-sort-places').forEach(btn => {
                    if (btn.dataset.sort === mode) {
                        btn.style.background = 'var(--color-primary)';
                        btn.style.color = 'var(--color-on-primary)';
                        btn.style.borderColor = 'var(--color-primary)';
                    } else {
                        btn.style.background = 'transparent';
                        btn.style.color = 'var(--color-text-main)';
                        btn.style.borderColor = 'var(--color-border)';
                    }
                });
            };

            updatePlacesActiveBtn(activeSortMode);

            placesSectionContent.querySelectorAll('.btn-sort-places').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const mode = btn.dataset.sort;
                    renderPlaces(mode);
                    updatePlacesActiveBtn(mode);
                    if (btn.closest('.popup-overlay')) {
                        btn.closest('.popup-overlay').classList.remove('show');
                    }
                });
            });
        }


        // Causes of death
        const containerDeaths = document.getElementById("analytics-deaths");
        if (containerDeaths && this.engine.db.death) {
            const deathsMap = {};
            this.engine.db.death.forEach(d => {
                const pid = d[COLUMNS.death?.personId || "person_id"];
                if (visibleIds && !visibleIds.has(String(pid))) return;

                let cause = d[COLUMNS.death?.cause || "d_cause"];
                if (cause && String(cause).trim() !== "") {
                    cause = String(cause).trim();
                    if (!deathsMap[cause]) {
                        deathsMap[cause] = { count: 0, people: [] };
                    }
                    deathsMap[cause].count++;
                    
                    let personName = "Невідомо";
                    const p = this.engine?.getPerson(pid);
                    if (p) {
                        personName = p.name || "";
                        if (p.source === "basic" && p.raw) {
                            const s = String(p.raw[COLUMNS.basic?.surname || "surname"] || "").trim();
                            const n = String(p.raw[COLUMNS.basic?.name || "name"] || "").trim();
                            const pat = String(p.raw[COLUMNS.basic?.patronymic || "patronymic"] || "").trim();
                            personName = [s, n, pat].filter(Boolean).join(" ");
                        }
                    }
                    if (!personName.trim()) personName = "Невідомо";
                    deathsMap[cause].people.push({ pid, name: personName });
                }
            });
            console.log("deathsMap:", deathsMap);
            const topDeaths = Object.entries(deathsMap).sort((a, b) => b[1].count - a[1].count);
            containerDeaths.style.display = "flex";
            containerDeaths.style.flexDirection = "column";
            containerDeaths.style.gap = "8px";
            if (topDeaths.length === 0) {
                containerDeaths.innerHTML = `<li style="list-style: none; color: var(--color-text-muted); padding: 12px; text-align: center; background: var(--color-bg-card); border-radius: 8px;">Немає даних про причини смерті</li>`;
            } else {
                containerDeaths.innerHTML = topDeaths.map(d => {
                    const cause = d[0];
                    const count = d[1].count;
                    const peopleList = d[1].people;
                    const peopleHtml = peopleList.length > 0 
                        ? `<ul style="margin: 8px 0 0 12px; padding: 0; list-style: disc; font-size: 13px; color: var(--color-text-muted);">
                            ${peopleList.map(person => `<li style="margin-bottom: 4px;"><a href="?id=${encodeURIComponent(person.pid)}&view=profile" class="js-stop-prop analytics-person-link" data-pid="${person.pid}" style="color: var(--color-primary); text-decoration: none;">${person.name}</a></li>`).join("")}
                          </ul>` 
                        : "";

                    return `
                    <li class="analytics-death-item" style="list-style: none; background: var(--color-bg-card); border: 1px solid var(--color-border-light); border-radius: 8px; overflow: hidden;">
                        <div class="analytics-death-header" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; cursor: pointer; user-select: none;">
                            <span style="font-size: 15px; font-weight: 500; color: var(--color-text-main);">${cause}</span>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="background: var(--color-bg-body); padding: 4px 10px; border-radius: 12px; font-size: 13px; font-weight: 500; color: var(--color-text-muted);">${count}</span>
                                <i class="ri-arrow-down-s-line analytics-death-icon" style="transition: transform 0.3s; color: var(--color-text-muted);"></i>
                            </div>
                        </div>
                        <div class="analytics-death-body" style="display: none; padding: 0 16px 16px 16px; border-top: 1px dashed var(--color-border-light); margin-top: 4px; padding-top: 12px;">
                            ${peopleHtml}
                        </div>
                    </li>
                `}).join("");
                
                // Add accordion behavior
                const deathItems = containerDeaths.querySelectorAll('.analytics-death-item');
                deathItems.forEach(item => {
                    const header = item.querySelector('.analytics-death-header');
                    const body = item.querySelector('.analytics-death-body');
                    const icon = item.querySelector('.analytics-death-icon');
                    header.addEventListener('click', () => {
                            
                        
                            const isOpen = body.style.display === 'block';
                        body.style.display = isOpen ? 'none' : 'block';
                        icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
                    });
                });
                

            }
        }

        // Events Calendar
        const containerEvents = document.getElementById("analytics-events-list");
        if (containerEvents) {
            const allEvents = [];
            
            const processEvents = (sourceList, type, cols, idGetter) => {
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
                    
                    if (isNaN(d) || isNaN(m)) return;
                    
                    let gregorian = { day: d, month: m, year: yearVal };
                    if (isOldStyle && !isNaN(yearVal)) {
                        const converted = convertJulianToGregorian(d, m, yearVal);
                        if (converted) gregorian = converted;
                    }
                    
                    const personId = ids[0];
                    const spouseId = ids[1];
                    const person = personId ? this.engine.getPerson(personId) : null;
                    const spouse = spouseId ? this.engine.getPerson(spouseId) : null;
                    
                    if (person) {
                        allEvents.push({
                            type,
                            year: yearVal,
                            gregorian,
                            original: { day: d, month: m, year: yearVal, isOldStyle },
                            person,
                            spouse,
                            recordType: String(record[cols.type] || "").trim()
                        });
                    }
                });
            };

            const DB = this.engine.db;
            if (DB) {
                processEvents(DB.birth, "birth", COLUMNS.birth, (rec) => rec[COLUMNS.birth.personId]);
                processEvents(DB.death, "death", COLUMNS.death, (rec) => rec[COLUMNS.death.personId]);
                processEvents(DB.marriage, "marriage", COLUMNS.marriage, (rec) => [rec[COLUMNS.marriage.personId], rec[COLUMNS.marriage.spouseId]]);
                processEvents(DB.baptism, "baptism", COLUMNS.baptism, (rec) => rec[COLUMNS.baptism.personId]);
                processEvents(DB.funeral, "funeral", COLUMNS.funeral, (rec) => rec[COLUMNS.funeral.personId]);
            }
            
            // Deduplicate events (e.g. prioritize "Фактично" over "Юридично")
            const groupedByTypeAndPerson = {};
            const uniqueEvents = [];
            allEvents.forEach(evt => {
                if (!evt.person) return;
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
            
            allEvents.length = 0;
            allEvents.push(...uniqueEvents);
            
            allEvents.sort((a, b) => {
                if (a.gregorian.month !== b.gregorian.month) return a.gregorian.month - b.gregorian.month;
                if (a.gregorian.day !== b.gregorian.day) return a.gregorian.day - b.gregorian.day;
                return (a.year || 9999) - (b.year || 9999);
            });
            
            if (allEvents.length === 0) {
                containerEvents.innerHTML = `<li style="list-style: none; color: var(--color-text-muted); padding: 12px; text-align: center; background: var(--color-bg-card); border-radius: 8px;">Немає даних про події</li>`;
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
                let tocLinksHtml = "";
                
                sortedMonths.forEach(m => {
                    const monthsNom = ["", "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];
                    const mName = monthsNom[m] || i18n.t("time.monthsGenitive")[m];
                    
                    tocLinksHtml += `<li><a href="#event-month-${m}" class="profile-toc-link js-event-month-link" data-month="${m}">${mName}</a></li>`;
                    
                    html += `
                        <li id="event-month-${m}" class="analytics-event-month-item" style="list-style: none; margin-top: 24px; margin-bottom: 12px; padding-bottom: 4px;">
                            <div class="analytics-event-month-header" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; border-bottom: 2px solid var(--color-border); padding-bottom: 8px;">
                                <h3 style="margin: 0; font-size: 20px; text-transform: capitalize; color: var(--color-text-main);">${mName}</h3>
                                <i class="ri-arrow-down-s-line analytics-event-month-icon analytics-mobile-only" style="transition: transform 0.3s; color: var(--color-text-main); font-size: 24px; transform: rotate(180deg);"></i>
                            </div>
                            <div class="analytics-event-month-body" style="display: block; padding-top: 8px;">
                                <ul style="list-style: none; padding: 0; margin: 0;">
                    `;
                    
                    const sortedDays = Object.keys(grouped[m]).map(Number).sort((a, b) => a - b);
                    sortedDays.forEach(d => {
                        html += `
                            <li style="list-style: none; margin-top: 16px; margin-bottom: 8px;">
                                <div style="margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text-main); background: var(--color-bg-sub); padding: 4px 12px; border-radius: 4px; display: inline-block;">${d} ${getMonthName(m)}</div>
                            </li>
                        `;
                        
                        const types = Object.keys(grouped[m][d]);
                        // Define fixed order for types if needed, or just use what exists
                        const typeOrder = ['birth', 'baptism', 'marriage', 'death', 'funeral'];
                        types.sort((a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b));
                        
                        types.forEach(t => {
                            html += `
                                <li style="list-style: none; margin-top: 8px; margin-bottom: 4px; margin-left: 12px;">
                                    <div style="font-size: 14px; font-weight: 600; color: var(--color-text-muted); margin-bottom: 4px;">${typeLabels[t]}</div>
                                    <ul style="list-style: none; padding-left: 0; margin: 0; display: flex; flex-direction: column; gap: 4px;">
                            `;
                            
                            grouped[m][d][t].forEach(evt => {
                                                                const getPersonPIB = (p, eventType) => {
                                    if (!p) return "Невідомо";
                                    const details = findPersonDetails(p.id, window.app?.engine);
                                    let s = details.surname || "";
                                    let n = details.name || "";
                                    let pat = details.patronymic || "";
                                    
                                    const isFem = details.gender === "f" || details.gender === "ж";
                                    if (["birth", "baptism", "marriage"].includes(eventType)) {
                                        if (isFem) {
                                            s = details.maidenName ? details.maidenName : "";
                                        }
                                    } else if (["death", "funeral"].includes(eventType)) {
                                        if (isFem) {
                                            if (details.marriedName) {
                                                const mSurnames = String(details.marriedName).split(/[,;]/).map(x => x.trim()).filter(Boolean);
                                                if (mSurnames.length > 0) {
                                                    s = mSurnames[mSurnames.length - 1];
                                                } else {
                                                    s = details.maidenName ? details.maidenName : "";
                                                }
                                            } else {
                                                s = details.maidenName ? details.maidenName : "";
                                            }
                                        }
                                    } else {
                                        if (isFem) {
                                            s = details.maidenName ? details.maidenName : "";
                                        }
                                    }
                                    
                                    const fullName = [s, n, pat].filter(Boolean).join(" ");
                                    return fullName || p.name || "Невідомо";
                                };

                                let p1Html = `<a href="?id=${encodeURIComponent(evt.person.id)}&view=profile" class="analytics-person-link js-stop-prop" data-pid="${evt.person.id}" style="color: var(--color-primary); text-decoration: none;">${escapeHtml(getPersonPIB(evt.person, evt.type))}</a>`;
                                let p2Html = "";
                                if (evt.type === "marriage" && evt.spouse) {
                                    p2Html = ` та <a href="?id=${encodeURIComponent(evt.spouse.id)}&view=profile" class="analytics-person-link js-stop-prop" data-pid="${evt.spouse.id}" style="color: var(--color-primary); text-decoration: none;">${escapeHtml(getPersonPIB(evt.spouse, evt.type))}</a>`;
                                }

                                let yearInfo = evt.year && !isNaN(evt.year) ? `<span style="color: var(--color-text-muted); font-size: 13px; margin-left: 8px;">(${evt.year} р.)</span>` : '';
                                
                                html += `
                                        <li style="display: flex; align-items: center; padding: 6px 12px; background: var(--color-bg-card); border: 1px solid var(--color-border-light); border-radius: 6px;">
                                            <div style="font-size: 15px; color: var(--color-text-main);">${p1Html}${p2Html}${yearInfo}</div>
                                        </li>
                                `;
                            });
                            
                            html += `
                                    </ul>
                                </li>
                            `;
                        });
                    });
                    html += `
                                </ul>
                            </div>
                        </li>
                    `;
                });
                
                // Close the month blocks
                // html = html.replace(/<\/li>\s*$/g, ""); // Remove the last closing li if any issues
                
                const eventsSectionContent = containerEvents.closest('.analytics-section-content');
                if (eventsSectionContent) {
                    eventsSectionContent.innerHTML = `
                        <div class="events-layout-with-sidebar" style="position: relative; width: 100%;">
                            <aside class="events-sidebar-desktop" style="display: none;">
                                <div>
                                    <div class="profile-toc-container">
                                        <h3 class="profile-toc-title">Місяці</h3>
                                        <ul class="profile-toc-list">
                                            ${tocLinksHtml}
                                        </ul>
                                    </div>
                                </div>
                            </aside>
                            <div class="events-body-blocks">
                                <ul id="analytics-events-list" class="analytics-list-none" style="padding: 0; margin: 0;">
                                    ${html}
                                </ul>
                            </div>
                        </div>
                    `;
                    
                    const newContainerEvents = document.getElementById("analytics-events-list");
                    
                    // Attach accordion events
                    newContainerEvents.querySelectorAll('.analytics-event-month-item').forEach(item => {
                        const header = item.querySelector('.analytics-event-month-header');
                        const body = item.querySelector('.analytics-event-month-body');
                        const icon = item.querySelector('.analytics-event-month-icon');
                        
                        const isDesktop = window.innerWidth >= 1200;
                        if (!isDesktop) {
                            body.style.display = 'none';
                            if (icon) icon.style.transform = 'rotate(0deg)';
                        }
                        
                        header.addEventListener('click', () => {
                            
                            
                            const isOpen = body.style.display === 'block';
                            body.style.display = isOpen ? 'none' : 'block';
                            if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
                        });
                    });
                    
                    // Attach smooth scroll for toc links
                    eventsSectionContent.querySelectorAll('.js-event-month-link').forEach(link => {
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            const targetId = link.getAttribute('href').substring(1);
                            const targetEl = document.getElementById(targetId);
                            if (targetEl) {
                                const body = targetEl.querySelector('.analytics-event-month-body');
                                const icon = targetEl.querySelector('.analytics-event-month-icon');
                                if (body && body.style.display === 'none') {
                                    body.style.display = 'block';
                                    if (icon) icon.style.transform = 'rotate(180deg)';
                                }
                                targetEl.scrollIntoView({ behavior: 'smooth' });
                            }
                        });
                    });

                    // Add link behavior
                    const links = newContainerEvents.querySelectorAll('.analytics-person-link');
                    links.forEach(link => {
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            const pid = e.target.getAttribute('data-pid') || e.currentTarget.getAttribute('data-pid');
                            if (pid && window.app && window.app.navigateToId) {
                                window.app.navigateToId(pid, false, 'profile');
                            }
                        });
                    });
                } // End if (eventsSectionContent)
            } // End else
        } // End if (containerEvents)


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
                        if (visibleIds && !visibleIds.has(String(pid))) return;
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
