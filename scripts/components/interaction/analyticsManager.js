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
        let confirmedCount = 0;
        let unconfirmedCount = 0;
        let confirmedMale = 0;
        let confirmedFemale = 0;
        let unconfirmedMale = 0;
        let unconfirmedFemale = 0;
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
            return `<a href="?id=${encodeURIComponent(pid)}&view=profile" class="js-stop-prop analytics-person-link" style="color: var(--color-text-main); text-decoration: none;">${escapeHtml(fullName)}</a>`;
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

            let isConfirmed = false;
            if (person.raw) {
                const rawStatus = String(person.raw[COLUMNS.basic?.status || "status"] || "").trim().toLowerCase();
                isConfirmed = rawStatus === "1" || rawStatus === "confirmed" || rawStatus === "true" || rawStatus === "так" || rawStatus === "+";
            }
            if (isConfirmed) {
                confirmedCount++;
                if (person.gender === "f" || person.gender === "ж") confirmedFemale++;
                else confirmedMale++;
            } else {
                unconfirmedCount++;
                if (person.gender === "f" || person.gender === "ж") unconfirmedFemale++;
                else unconfirmedMale++;
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
                    <a href="?id=${encodeURIComponent(obj.id)}&view=profile" style="position: relative; display: flex; align-items: center; background: var(--color-bg-body); border-radius: 8px; text-decoration: none; color: var(--color-text-main); font-size: 14px; transition: opacity 0.2s; width: 100%; overflow: hidden; border: 1px solid var(--color-border);" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
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
                    <div style="margin-bottom: 16px; display: flex; align-items: center; width: 100%; padding: 12px 0;">
                        <div style="flex-grow: 1; height: 1px; background: var(--color-border-light);"></div>
                        <div style="margin: 0 16px; font-size: 12px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.5px;">${title}</div>
                        <div style="flex-grow: 1; height: 1px; background: var(--color-border-light);"></div>
                    </div>
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
                        <li style="list-style: none; display: inline-flex; flex-direction: column; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 8px; padding: 12px; font-size: 15px; line-height: 1.4; color: var(--color-text-main);">
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
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px;" class="analytics-summary-stats">
                        <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
                            <div style="color: var(--color-text-muted); font-size: 14px; margin-bottom: 12px;">Підтверджені</div>
                            <div style="font-size: 24px; font-weight: bold; color: var(--color-text-main); margin-bottom: 8px;">${confirmedCount}</div>
                            <div style="color: var(--color-text-meta); font-size: 12px; margin-top: 4px;">Чоловіків: ${confirmedMale} / Жінок: ${confirmedFemale}</div>
                        </div>
                        
                        <div class="analytics-summary-stats-divider"></div>

                        <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
                            <div style="color: var(--color-text-muted); font-size: 14px; margin-bottom: 12px;">Загальна кількість</div>
                            <div style="font-size: 32px; font-weight: bold; color: var(--color-primary); margin-bottom: 8px;">${totalPeople}</div>
                            <div style="color: var(--color-text-meta); font-size: 14px; margin-top: 4px;">Чоловіків: ${maleCount} / Жінок: ${femaleCount}</div>
                        </div>

                        <div class="analytics-summary-stats-divider"></div>
                        
                        <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
                            <div style="color: var(--color-text-muted); font-size: 14px; margin-bottom: 12px;">Непідтверджені</div>
                            <div style="font-size: 24px; font-weight: bold; color: var(--color-text-main); margin-bottom: 8px;">${unconfirmedCount}</div>
                            <div style="color: var(--color-text-meta); font-size: 12px; margin-top: 4px;">Чоловіків: ${unconfirmedMale} / Жінок: ${unconfirmedFemale}</div>
                        </div>
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
                    
                    <a href="#" class="analytics-nav-btn" data-target="analytics-timeline" data-title="Хронологія" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px 16px; color: var(--color-text-main); text-decoration: none; transition: all 0.2s;">
                        <div style="font-size: 18px; font-weight: 600; text-align: center;">Хронологія</div>
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
                <li id="${blockId}" class="analytics-place-item" style="list-style: none; margin-top: ${html === "" ? "0" : "24px"}; margin-bottom: 12px; padding-bottom: 4px;">
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
                                        ? `<ul style="list-style: none; padding-left: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;">
                                            ${peopleList.map(personName => `
                                            <li style="padding: 12px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 8px; list-style: none; margin-left: 12px;">
                                                <div style="font-size: 15px; color: var(--color-text-main); line-height: 1.4;">
                                                    ${personName}
                                                </div>
                                            </li>`).join("")}
                                          </ul>` 
                                        : "";
                                    return `
                                        <li style="list-style: none; margin-top: 16px; margin-bottom: 8px;">
                                            <div style="margin: 0 0 8px 12px; font-size: 14px; font-weight: 600; color: var(--color-text-main); background: var(--color-bg-sub); padding: 4px 12px; border-radius: 4px; display: inline-block; text-transform: capitalize;">${evtName} <span style="font-weight: normal; margin-left: 4px;">(${evtCount})</span></div>
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
            
            // Add accordion behavior for places
            const placeItems = this.containerPlaces.querySelectorAll('.analytics-place-item');
            placeItems.forEach(item => {
                const header = item.querySelector('.analytics-place-header');
                const body = item.querySelector('.analytics-place-body');
                const icon = item.querySelector('.analytics-place-icon');
                
                const isDesktop = window.innerWidth >= 1200;
                if (!isDesktop) {
                    body.style.display = 'none';
                    if (icon) icon.style.transform = 'rotate(0deg)';
                } else {
                    header.style.cursor = 'default';
                }

                header.addEventListener('click', () => {
                    if (window.innerWidth >= 1200) return;
                    const isOpen = body.style.display === 'block';
                    body.style.display = isOpen ? 'none' : 'block';
                    if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
                });
            });
            
            // Sidebar display on desktop
            const sidebar = this.containerPlaces.querySelector('.events-sidebar-desktop');
            if (sidebar && window.innerWidth >= 1200) {
                sidebar.style.display = 'block';
            }
            
            // Attach smooth scroll for toc links
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
            
            // Sort container buttons
            const activeSort = sortMode || window.app?.managers?.analytics?.currentPlaceSort || 'alphabet_az'; 
            document.querySelectorAll('.btn-sort-places').forEach(btn => {
                if (btn.dataset.sort === activeSort) {
                    btn.style.background = 'var(--color-primary)';
                    btn.style.color = 'white';
                    btn.style.borderColor = 'var(--color-primary)';
                } else {
                    btn.style.background = 'transparent';
                    btn.style.color = 'var(--color-text-main)';
                    btn.style.borderColor = 'var(--color-border)';
                }
                
                btn.onclick = (e) => {
                    e.preventDefault();
                    const nextSortMode = e.currentTarget.dataset.sort;
                    if (window.app && window.app.managers && window.app.managers.analytics) {
                        window.app.managers.analytics.currentPlaceSort = nextSortMode;
                    }
                    if (btn.closest('.popup-overlay')) {
                        btn.closest('.popup-overlay').classList.remove('show');
                    }
                    renderPlaces(nextSortMode);
                };
            });
        }
        renderPlaces(window.app?.managers?.analytics?.currentPlaceSort || 'alphabet_az');
        
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
                    const peopleHtml2 = peopleList.length > 0 
                        ? `<ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;">
                            ${peopleList.map(person => `
                                <li style="padding: 12px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 8px; list-style: none;">
                                    <div style="font-size: 15px; color: var(--color-text-main); line-height: 1.4;">
                                        <a href="?id=${encodeURIComponent(person.pid)}&view=profile" class="analytics-person-link js-stop-prop" data-pid="${person.pid}" style="color: var(--color-text-main); text-decoration: none;">${escapeHtml(person.name)}</a>
                                    </div>
                                </li>
                            `).join("")}
                          </ul>` 
                        : "";

                    return `
                    <li class="analytics-death-item" style="list-style: none; margin-top: ${d[0] === topDeaths[0][0] ? '0' : '24px'}; margin-bottom: 12px; padding-bottom: 4px;">
                        <div class="analytics-death-header" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; border-bottom: 2px solid var(--color-border); padding-bottom: 8px;">
                            <h3 style="margin: 0; font-size: 20px; color: var(--color-text-main);">${cause}</h3>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 16px; font-weight: 600; color: var(--color-text-muted);">${count}</span>
                                <i class="ri-arrow-down-s-line analytics-death-icon analytics-mobile-only" style="transition: transform 0.3s; color: var(--color-text-main); font-size: 24px; transform: rotate(180deg);"></i>
                            </div>
                        </div>
                        <div class="analytics-death-body" style="display: block; padding-top: 16px;">
                            ${peopleHtml2}
                        </div>
                    </li>
                `}).join("");

                // Add accordion behavior
                const deathItems = containerDeaths.querySelectorAll('.analytics-death-item');
                deathItems.forEach(item => {
                    const header = item.querySelector('.analytics-death-header');
                    const body = item.querySelector('.analytics-death-body');
                    const icon = item.querySelector('.analytics-death-icon');
                    
                    const isDesktop = window.innerWidth >= 1200;
                    if (!isDesktop) {
                        body.style.display = 'none';
                        if (icon) icon.style.transform = 'rotate(0deg)';
                    } else {
                        header.style.cursor = 'default';
                    }

                    header.addEventListener('click', () => {
                        if (window.innerWidth >= 1200) return;
                        const isOpen = body.style.display === 'block';
                        body.style.display = isOpen ? 'none' : 'block';
                        if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
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
                    const yearStr = record[cols.year] ? String(record[cols.year]).trim() : "";
                    let yearVal = parseInt(yearStr, 10);
                    const yearMatch = yearStr.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
                    if (yearMatch) {
                        yearVal = parseInt(yearMatch[1], 10);
                    }
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
                            original: { day: d, month: m, year: yearVal, isOldStyle, yearStr },
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
                        <li id="event-month-${m}" class="analytics-event-month-item" style="list-style: none; margin-top: ${html === "" ? "0" : "24px"}; margin-bottom: 12px; padding-bottom: 4px;">
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
                                    <ul style="list-style: none; padding-left: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;">
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

                                let p1Html = `<a href="?id=${encodeURIComponent(evt.person.id)}&view=profile" class="analytics-person-link js-stop-prop" data-pid="${evt.person.id}" style="color: var(--color-text-main); text-decoration: none;">${escapeHtml(getPersonPIB(evt.person, evt.type))}</a>`;
                                let p2Html = "";
                                if (evt.type === "marriage" && evt.spouse) {
                                    p2Html = ` та <a href="?id=${encodeURIComponent(evt.spouse.id)}&view=profile" class="analytics-person-link js-stop-prop" data-pid="${evt.spouse.id}" style="color: var(--color-text-main); text-decoration: none;">${escapeHtml(getPersonPIB(evt.spouse, evt.type))}</a>`;
                                }

                                let yearInfo = evt.original.yearStr ? `<span style="color: var(--color-text-muted); font-size: 13px; margin-left: 8px;">(${escapeHtml(evt.original.yearStr)} р.)</span>` : (evt.year && !isNaN(evt.year) ? `<span style="color: var(--color-text-muted); font-size: 13px; margin-left: 8px;">(${evt.year} р.)</span>` : "");
                                
                                html += `
                                        <li style="padding: 12px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 8px; list-style: none;">
                                            <div style="font-size: 15px; color: var(--color-text-main); line-height: 1.4;">${p1Html}${p2Html}${yearInfo}</div>
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
                } else {
                    header.style.cursor = 'default';
                }
                        
                        header.addEventListener('click', () => {
                    if (window.innerWidth >= 1200) return;
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
                                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        });
                    });

                    // Add link behavior
// delegated to router
                } // End if (eventsSectionContent)
            } // End else
        } // End if (containerEvents)



        // Timeline of events
        const containerTimeline = document.getElementById("analytics-timeline-list");
        if (containerTimeline) {
            const allTimelineEvents = [];
            
            const processEventsForTimeline = (sourceList, type, cols, idGetter) => {
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
const yearStr = record[cols.year] ? String(record[cols.year]).trim() : "";
                    let yearVal = parseInt(yearStr, 10);
                    const yearMatch = yearStr.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
                    if (yearMatch) {
                        yearVal = parseInt(yearMatch[1], 10);
                    }
                    const isOldStyle = ["1", "true", "+"].includes(String(record[cols.calendar] || "").trim());
                    
                    if (isNaN(yearVal)) return; // Requires year for sorting
                    
                    let gregorian = { day: isNaN(d) ? null : d, month: isNaN(m) ? null : m, year: yearVal };
                    if (isOldStyle) {
                        const converted = convertJulianToGregorian(isNaN(d) ? 1 : d, isNaN(m) ? 1 : m, yearVal);
                        if (converted) gregorian = converted;
                    }
                    
                    const personId = ids[0];
                    const spouseId = ids[1];
                    const person = personId ? this.engine.getPerson(personId) : null;
                    const spouse = spouseId ? this.engine.getPerson(spouseId) : null;
                    
                    if (person) {
                        allTimelineEvents.push({
                            type,
                            year: yearVal,
                            gregorian,
                            original: { day: isNaN(d) ? null : d, month: isNaN(m) ? null : m, year: yearVal, isOldStyle, yearStr },
                            person,
                            spouse,
                            recordType: String(record[cols.type] || "").trim()
                        });
                    }
                });
            };

            const DB = this.engine.db;
            if (DB) {
                processEventsForTimeline(DB.birth, "birth", COLUMNS.birth, (rec) => rec[COLUMNS.birth.personId]);
                processEventsForTimeline(DB.death, "death", COLUMNS.death, (rec) => rec[COLUMNS.death.personId]);
                processEventsForTimeline(DB.marriage, "marriage", COLUMNS.marriage, (rec) => [rec[COLUMNS.marriage.personId], rec[COLUMNS.marriage.spouseId]]);
                processEventsForTimeline(DB.baptism, "baptism", COLUMNS.baptism, (rec) => rec[COLUMNS.baptism.personId]);
                processEventsForTimeline(DB.funeral, "funeral", COLUMNS.funeral, (rec) => rec[COLUMNS.funeral.personId]);
            }
            
            // Deduplicate
            const groupedByTypeAndPerson = {};
            const uniqueEvents = [];
            allTimelineEvents.forEach(evt => {
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
            
            allTimelineEvents.length = 0;
            allTimelineEvents.push(...uniqueEvents);
            
            let sortDesc = true;
            let currentFilter = "all";

            if (!this.timelineViewMode) {
                this.timelineViewMode = "list";
            }
            let timelineViewMode = this.timelineViewMode;
            
            const btnViewList = document.getElementById("timeline-view-list-btn");
            const btnViewChart = document.getElementById("timeline-view-chart-btn");
            const chartContainer = document.getElementById("analytics-timeline-chart");
            
            const filterTypeSelect = document.getElementById("timeline-filter-wrapper") || document.getElementById("timeline-filter-type");
            const sortBtn = document.getElementById("timeline-sort-btn");
            
            if (btnViewList && btnViewChart) {
                const updateButtonStyles = () => {
                    if (timelineViewMode === "list") {
                        btnViewList.style.background = 'var(--color-primary)';
                        btnViewList.style.color = 'white';
                        btnViewChart.style.background = 'transparent';
                        btnViewChart.style.color = 'var(--color-text-main)';
                        if (filterTypeSelect) filterTypeSelect.style.display = 'inline-flex';
                        if (sortBtn) sortBtn.style.display = 'inline-flex';
                    } else {
                        btnViewChart.style.background = 'var(--color-primary)';
                        btnViewChart.style.color = 'white';
                        btnViewList.style.background = 'transparent';
                        btnViewList.style.color = 'var(--color-text-main)';
                        if (filterTypeSelect) filterTypeSelect.style.display = 'none';
                        if (sortBtn) sortBtn.style.display = 'none';
                    }
                };
                
                updateButtonStyles();
                
                btnViewList.addEventListener("click", () => {
                    this.timelineViewMode = "list";
                    timelineViewMode = "list";
                    updateButtonStyles();
                    renderTimeline();
                });
                btnViewChart.addEventListener("click", () => {
                    this.timelineViewMode = "chart";
                    timelineViewMode = "chart";
                    updateButtonStyles();
                    renderTimeline();
                });
            }
            
            
            const renderTimelineChart = () => {
                if (!chartContainer) return;
                
                const timelineList = document.getElementById("analytics-timeline-list");
                const personEvents = {};
                
                allTimelineEvents.forEach(evt => {
                    if (currentFilter !== "all" && evt.type !== currentFilter) return;
                    if (!evt.gregorian || isNaN(evt.gregorian.year)) return;
                    
                    const pid = evt.person.id;
                    if (!personEvents[pid]) {
                        personEvents[pid] = { person: evt.person, birth: null, death: null, marriages: [], events: [] };
                    }
                    
                    if (evt.type === 'birth') personEvents[pid].birth = evt.gregorian.year;
                    else if (evt.type === 'death' || evt.type === 'funeral') {
                        if (!personEvents[pid].death) personEvents[pid].death = evt.gregorian.year;
                    }
                    else if (evt.type === 'marriage') {
                        personEvents[pid].marriages.push(evt.gregorian.year);
                    }
                    personEvents[pid].events.push(evt);
                });
                
                const validPeople = Object.values(personEvents).filter(p => p.birth !== null || p.death !== null);
                
                if (validPeople.length === 0) {
                    chartContainer.innerHTML = "<div style='padding: 16px; text-align: center; color: var(--color-text-muted);'>Немає даних для побудови графіка</div>";
                    return;
                }
                
                let minYear = 9999;
                
                validPeople.forEach(p => {
                    let by = p.birth;
                    let dy = p.death;
                    if (by !== null && dy === null) dy = by + 70;
                    else if (dy !== null && by === null) by = dy - 70;
                    
                    if (by < minYear) minYear = by;
                });
                
                minYear -= 10;
                const maxYear = 2026; // Strictly cut by current year
                
                const ypx = 12; // pixels per year
                const totalYears = maxYear - minYear;
                const totalWidth = totalYears * ypx;
                
                const yearToPx = (y) => sortDesc ? (maxYear - y) * ypx : (y - minYear) * ypx;
                const pxToYear = (px) => sortDesc ? maxYear - (px / ypx) : minYear + (px / ypx);
                
                let axisHtml = '<div id="analytics-timeline-axis" style="position: sticky; top: 0; height: 30px; border-bottom: 1px solid var(--color-border); z-index: 100; background-color: var(--color-bg-card); cursor: pointer;">';
                
                let d = Math.floor(minYear / 10) * 10;
                let tocCenturies = new Set();
                
                while (d <= maxYear) {
                    const isCentury = d % 100 === 0;
                    if (isCentury) {
                        const cent = Math.ceil((d+1) / 100);
                        tocCenturies.add(cent);
                    }
                    const px = yearToPx(d);
                    const markerHeight = isCentury ? 8 : 4;
                    const borderLeft = isCentury ? '2px solid var(--color-text-main)' : '1px solid var(--color-border)';
                    const text = isCentury ? `<b>${d}</b>` : `${d}`;
                    
                    axisHtml += `
                        <div id="chart-decade-${d}" style="position: absolute; left: ${px}px; top: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none;">
                            <div style="font-size: 10px; color: var(--color-text-muted); line-height: 1;">${text}</div>
                            <div style="margin-top: 2px; width: 1px; height: ${markerHeight}px; border-left: ${borderLeft};"></div>
                        </div>
                    `;
                    d += 10;
                }
                
    
    const scrubberHandleHtml = `
        <div id="timeline-scrubber-handle" style="position: absolute; top: 0; left: ${yearToPx(maxYear)}px; margin-left: -14px; width: 30px; height: 30px; background: var(--color-primary); border-radius: 50%; color: white; font-size: 10px; font-weight: bold; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); user-select: none; cursor: ew-resize;">
            ${maxYear}
        </div>
    `;
    const scrubberLineHtml = `
        <div id="timeline-scrubber" style="position: absolute; top: 0; bottom: 0; left: ${yearToPx(maxYear)}px; width: 2px; background: var(--color-primary); z-index: 50; cursor: ew-resize; pointer-events: none;">
        </div>
    `;
    
    axisHtml += scrubberHandleHtml + "</div>";
    
                
                let rowsHtml = '<div style="position: relative; margin-top: 12px; padding-bottom: 16px;">';
                
                validPeople.sort((a, b) => {
                    const aY = a.birth !== null ? a.birth : (a.death - 70);
                    const bY = b.birth !== null ? b.birth : (b.death - 70);
                    return sortDesc ? (bY - aY) : (aY - bY); 
                });
                
                validPeople.forEach((p, idx) => {
                    let by = p.birth;
                    let dy = p.death;
                    
                    let isAlive = false;
                    if (dy === null && by !== null && (maxYear - by) <= 120) {
                        isAlive = true;
                    }
                    
                    let startY = by !== null ? by : (dy - 70);
                    let endY = dy !== null ? dy : (by + 70);
                    
                    if (isAlive) {
                        endY = maxYear;
                    }
                    
                    if (startY < minYear) startY = minYear;
                    if (endY > maxYear) endY = maxYear;
                    if (startY > maxYear || endY < minYear) return;
                    
                    let px1 = yearToPx(startY);
                    let px2 = yearToPx(endY);
                    
                    let leftPx = Math.min(px1, px2);
                    let widthPx = Math.abs(px2 - px1);
                    
                    let bgStyle = 'background: rgba(30, 136, 229, 0.2); border: 1px solid rgba(30, 136, 229, 0.5);';
                    let borderRadius = 'border-radius: 4px;';
                    
                    if (isAlive) {
                        bgStyle = 'background: rgba(30, 136, 229, 0.6); border: 1px solid rgba(30, 136, 229, 0.9);';
                    } else if (by === null) {
                        bgStyle = sortDesc 
                            ? 'background: linear-gradient(to left, transparent, rgba(30, 136, 229, 0.4)); border: none; border-left: 2px solid rgba(30, 136, 229, 0.8);'
                            : 'background: linear-gradient(to right, transparent, rgba(30, 136, 229, 0.4)); border: none; border-right: 2px solid rgba(30, 136, 229, 0.8);';
                        borderRadius = sortDesc ? 'border-radius: 4px 0 0 4px;' : 'border-radius: 0 4px 4px 0;';
                    } else if (dy === null) {
                        bgStyle = sortDesc
                            ? 'background: linear-gradient(to right, transparent, rgba(30, 136, 229, 0.4)); border: none; border-right: 2px solid rgba(30, 136, 229, 0.8);'
                            : 'background: linear-gradient(to left, transparent, rgba(30, 136, 229, 0.4)); border: none; border-left: 2px solid rgba(30, 136, 229, 0.8);';
                        borderRadius = sortDesc ? 'border-radius: 0 4px 4px 0;' : 'border-radius: 4px 0 0 4px;';
                    }
                    
                    let markersHtml = '';
                    if (by !== null && by >= minYear && by <= maxYear) {
                        const mLeft = yearToPx(by) - leftPx;
                        markersHtml += `<div style="position: absolute; left: ${mLeft}px; top: 50%; transform: translate(-50%, -50%); width: 8px; height: 8px; border-radius: 50%; background: var(--color-success); border: 1px solid white;" title="Народження (${by})"></div>`;
                    }
                    if (dy !== null && dy >= minYear && dy <= maxYear && !isAlive) {
                        const mLeft = yearToPx(dy) - leftPx;
                        markersHtml += `<div style="position: absolute; left: ${mLeft}px; top: 50%; transform: translate(-50%, -50%); width: 8px; height: 8px; border-radius: 50%; background: var(--color-danger); border: 1px solid white;" title="Смерть (${dy})"></div>`;
                    }
                    p.marriages.forEach(my => {
                        if (my >= minYear && my <= maxYear) {
                            const mLeft = yearToPx(my) - leftPx;
                            markersHtml += `<div style="position: absolute; left: ${mLeft}px; top: 50%; transform: translate(-50%, -50%); width: 6px; height: 6px; border-radius: 50%; background: var(--color-warning); border: 1px solid white;" title="Шлюб (${my})"></div>`;
                        }
                    });
                    
                    rowsHtml += `
                        <div style="display: flex; align-items: center; height: 28px; position: relative;">
                            <div style="position: absolute; left: 0; right: 0; height: 1px; background: var(--color-border-light); z-index: 1;"></div>
                            
                            <div style="position: absolute; left: ${leftPx}px; width: ${widthPx}px; height: 16px; ${bgStyle} ${borderRadius} z-index: 2; box-sizing: border-box;">
                                ${markersHtml}
                            </div>
                            
                            <div style="position: absolute; left: ${leftPx + widthPx + 8}px; white-space: nowrap; font-size: 11px; z-index: 3; color: var(--color-text-main);">
                                <a href="?id=${encodeURIComponent(p.person.id)}&view=profile" class="analytics-person-link" data-pid="${p.person.id}" style="color: inherit; text-decoration: none;">${escapeHtml(p.person.name)}</a>
                            </div>
                        </div>
                    `;
                });
                
                rowsHtml += '</div>';
                
                let gridHtml = '<div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none;">';
                d = Math.floor(minYear / 10) * 10;
                while (d <= maxYear) {
                    const isCentury = d % 100 === 0;
                    const borderLeft = isCentury ? '2px dashed var(--color-border-light)' : '1px dashed var(--color-border-light)';
                    const opacity = isCentury ? 1 : 0.5;
                    const px = yearToPx(d);
                    gridHtml += `<div style="position: absolute; left: ${px}px; top: 0; bottom: 0; border-left: ${borderLeft}; opacity: ${opacity};"></div>`;
                    d += 10;
                }
                gridHtml += '</div>';
                
                
                
                chartContainer.innerHTML = `
                    <div style="min-width: max(${totalWidth + 300}px, 100%); position: relative;" id="analytics-timeline-chart-inner">
                        ${axisHtml}
                        <div style="position: relative;" id="analytics-timeline-rows-container">
                            ${gridHtml}
                            ${rowsHtml}
                            ${typeof scrubberLineHtml !== "undefined" ? scrubberLineHtml : ""}
                            
                        </div>
                    </div>
                `;
                
// delegated to router
                
                const getCenturyRoman = (c) => {
                    const romanNumerals = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI", "XXII", "XXIII", "XXIV", "XXV"];
                    return romanNumerals[c] || c;
                };
                
                let tocLinksHtml = Array.from(tocCenturies).sort((a, b) => b - a).map(c => `<li><a href="#" data-cent="${c}" class="profile-toc-link js-scroll-chart">${getCenturyRoman(c)} століття</a></li>`).join('');
                
                let sidebar = timelineList && timelineList.closest('.events-layout-with-sidebar') ? timelineList.closest('.events-layout-with-sidebar').querySelector('.events-sidebar-desktop') : null;
                if (!sidebar && timelineList) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'events-layout-with-sidebar';
                    wrapper.style.cssText = 'position: relative; width: 100%;';
                    sidebar = document.createElement('aside');
                    sidebar.className = 'events-sidebar-desktop';
                    const bodyBlocks = document.createElement('div');
                    bodyBlocks.className = 'events-body-blocks';
                    timelineList.parentNode.insertBefore(wrapper, timelineList);
                    wrapper.appendChild(sidebar);
                    wrapper.appendChild(bodyBlocks);
                    bodyBlocks.appendChild(timelineList);
                    if (chartContainer) bodyBlocks.appendChild(chartContainer);
                }
                
                if (sidebar) {
                    const isDesktop = window.innerWidth >= 1200;
                    sidebar.style.display = isDesktop ? 'block' : 'none';
                    
                    const valueId = "timeline-year-value";
                    const resultsId = "timeline-alive-results";
                    
                    sidebar.innerHTML = `
                        <div>
                            <div class="profile-toc-container">
                                <h3 class="profile-toc-title">ХТО ЖИВ В РОЦІ...</h3>
                                <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 8px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <span id="${valueId}" style="font-weight: 600; font-size: 20px; color: var(--color-primary);">${maxYear}</span>
                                    </div>
                                    <div id="${resultsId}" style="max-height: 400px; overflow-y: auto; margin-top: 8px; display: flex; flex-direction: column; gap: 4px;">
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    sidebar.querySelectorAll('.js-scroll-chart').forEach(link => {
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            const c = parseInt(e.currentTarget.getAttribute('data-cent'), 10);
                            const year = (c - 1) * 100;
                            const dec = Math.floor(year / 10) * 10;
                            const el = document.getElementById(`chart-decade-${dec}`);
                            if (el && chartContainer) {
                                chartContainer.scrollTo({
                                    left: el.offsetLeft - 16,
                                    behavior: 'smooth'
                                });
                            }
                        });
                    });
                    
                    const valDisplay = document.getElementById(valueId);
                    const resultsBox = document.getElementById(resultsId);
                    
                    const updateAliveList = (y) => {
                        if (!valDisplay || !resultsBox) return;
                        valDisplay.textContent = Math.round(y);
                        
                        const alive = validPeople.filter(p => {
                            let by = p.birth;
                            let dy = p.death;
                            
                            let isAlive = false;
                            if (dy === null && by !== null && (maxYear - by) <= 120) {
                                isAlive = true;
                            }
                            
                            let startY = by !== null ? by : (dy - 70);
                            let endY = dy !== null ? dy : (by + 70);
                            if (isAlive) endY = maxYear;
                            
                            return y >= startY && y <= endY;
                        });
                        
                        if (alive.length === 0) {
                            resultsBox.innerHTML = '<div style="font-size: 11px; color: var(--color-text-muted);">Немає даних</div>';
                        } else {
                            alive.sort((a,b) => a.person.name.localeCompare(b.person.name));
                            resultsBox.innerHTML = alive.map(p => `
                                <div style="font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 4px 0; flex-shrink: 0;">
                                    <a href="?id=${encodeURIComponent(p.person.id)}&view=profile" class="analytics-person-link" data-pid="${p.person.id}" style="color: var(--color-text-main); text-decoration: none;">${escapeHtml(p.person.name)}</a>
                                </div>
                            `).join('');
                            
// delegated to router
                        }
                    };
                    
                    updateAliveList(maxYear); // Initial call
                    
                    // Scrubber Drag Logic
                    const scrubber = document.getElementById('timeline-scrubber');
                    const scrubberHandle = document.getElementById('timeline-scrubber-handle');
                    const innerChart = document.getElementById('analytics-timeline-chart-inner');
                    
                    let isDraggingScrubber = false;
                    let isDraggingCanvas = false;
                    let startX = 0;
                    let scrollLeftStart = 0;
                    
                    
                    const axis = document.getElementById('analytics-timeline-axis');
                    if (axis) {
                        axis.addEventListener('click', (e) => {
                            const rect = innerChart.getBoundingClientRect();
                            let x = e.clientX - rect.left;
                            if (x < 0) x = 0;
                            if (x > totalWidth) x = totalWidth;
                            
                            if (scrubber) scrubber.style.left = `${x}px`;
                            if (scrubberHandle) {
                                scrubberHandle.style.left = `${x}px`;
                                const currentYear = pxToYear(x);
                                scrubberHandle.textContent = Math.round(currentYear);
                                updateAliveList(currentYear);
                            }
                        });
                    }
                    
                    if (scrubber) {
                        scrubberHandle.addEventListener('mousedown', (e) => {
                            isDraggingScrubber = true;
                            document.body.style.userSelect = 'none';
                            e.stopPropagation();
                        });
                        
                        document.addEventListener('mousemove', (e) => {
                            if (!isDraggingScrubber) return;
                            const rect = innerChart.getBoundingClientRect();
                            let x = e.clientX - rect.left;
                            if (x < 0) x = 0;
                            if (x > totalWidth) x = totalWidth;
                            
                            scrubber.style.left = `${x}px`;
                            if (scrubberHandle) scrubberHandle.style.left = `${x}px`;
                            
                            const currentYear = pxToYear(x);
                            scrubberHandle.textContent = Math.round(currentYear);
                            updateAliveList(currentYear);
                            
                            // Auto scroll if dragging near edges
                            const containerRect = chartContainer.getBoundingClientRect();
                            if (e.clientX < containerRect.left + 50) {
                                chartContainer.scrollLeft -= 10;
                            } else if (e.clientX > containerRect.right - 50) {
                                chartContainer.scrollLeft += 10;
                            }
                        });
                        
                        document.addEventListener('mouseup', () => {
                            if (isDraggingScrubber) {
                                isDraggingScrubber = false;
                                document.body.style.userSelect = '';
                            }
                        });
                    }
                    
                    // Canvas Pan Logic
                    if (chartContainer) {
                        chartContainer.addEventListener('mousedown', (e) => {
                            if (e.target.closest('#timeline-scrubber-handle') || e.target.closest('a')) return;
                            isDraggingCanvas = true;
                            startX = e.pageX - chartContainer.offsetLeft;
                            scrollLeftStart = chartContainer.scrollLeft;
                            chartContainer.style.cursor = 'grabbing';
                        });
                        
                        chartContainer.addEventListener('mousemove', (e) => {
                            if (!isDraggingCanvas) return;
                            e.preventDefault();
                            const x = e.pageX - chartContainer.offsetLeft;
                            const walk = (x - startX) * 1.5; // scroll-fast
                            chartContainer.scrollLeft = scrollLeftStart - walk;
                        });
                        
                        chartContainer.addEventListener('mouseup', () => {
                            isDraggingCanvas = false;
                            chartContainer.style.cursor = '';
                        });
                        
                        chartContainer.addEventListener('mouseleave', () => {
                            isDraggingCanvas = false;
                            chartContainer.style.cursor = '';
                        });
                    }
                }
            };
const renderTimeline = () => {
                if (timelineViewMode === "chart") {
                    const timelineList = document.getElementById("analytics-timeline-list");
                    if (timelineList) timelineList.style.display = "none";
                    if (chartContainer) chartContainer.style.display = "block";
                    renderTimelineChart();
                    
                    
                    return;
                }
                
                const timelineList = document.getElementById("analytics-timeline-list");
                if (timelineList) timelineList.style.display = "flex";
                if (chartContainer) chartContainer.style.display = "none";

                const typeLabels = {
                    birth: i18n.t("events.birth") || "Народження",
                    baptism: i18n.t("events.baptism") || "Хрещення",
                    marriage: i18n.t("events.marriage") || "Шлюб",
                    death: i18n.t("events.death") || "Смерть",
                    funeral: i18n.t("events.funeral") || "Поховання"
                };

                allTimelineEvents.sort((a, b) => {
                    const yA = a.gregorian.year || 0;
                    const yB = b.gregorian.year || 0;
                    const mA = a.gregorian.month || 0;
                    const mB = b.gregorian.month || 0;
                    const dA = a.gregorian.day || 0;
                    const dB = b.gregorian.day || 0;
                    
                    if (yA !== yB) return sortDesc ? yB - yA : yA - yB;
                    if (mA !== mB) return sortDesc ? mB - mA : mA - mB;
                    if (dA !== dB) return sortDesc ? dB - dA : dA - dB;

                    const labelA = typeLabels[a.type] || a.type;
                    const labelB = typeLabels[b.type] || b.type;
                    
                    if (labelA !== labelB) {
                        return labelA.localeCompare(labelB);
                    }
                    
                    const nameA = a.person ? a.person.name || "" : "";
                    const nameB = b.person ? b.person.name || "" : "";
                    return nameA.localeCompare(nameB);
                });
                
                const getCenturyRoman = (c) => {
                    const romanNumerals = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI", "XXII", "XXIII", "XXIV", "XXV"];
                    return romanNumerals[c] || c;
                };
                
                let tocCenturies = new Set();
                let html = "";
                const filteredEvents = allTimelineEvents.filter(e => currentFilter === "all" || e.type === currentFilter);
                
                if (filteredEvents.length === 0) {
                    html = "<li style='padding: 16px; text-align: center; color: var(--color-text-muted);'>Немає подій для відображення</li>";
                } else {

                    const icons = {
                        birth: "ri-star-line",
                        baptism: "ri-drop-line",
                        marriage: "ri-hearts-line",
                        death: "ri-add-line",
                        funeral: "ri-archive-line"
                    };
                    
                    const getMonthNameSafe = (monthNum, isNominative = false) => {
                        const key = isNominative ? "time.monthsNominative" : "time.monthsGenitive";
                        const months = i18n.t(key);
                        return Array.isArray(months) ? months[monthNum] || "" : "";
                    };

                    let currentCentury = null;
                    
                    filteredEvents.forEach(evt => {
                        if (evt.gregorian.year && !isNaN(evt.gregorian.year)) {
                            const cent = Math.ceil(evt.gregorian.year / 100);
                            if (cent !== currentCentury) {
                                currentCentury = cent;
                                tocCenturies.add(cent);
                                html += `
                                    <li id="timeline-century-${currentCentury}" class="analytics-timeline-century-item" style="list-style: none; margin-top: ${html === "" ? "0" : "24px"}; margin-bottom: 16px; display: flex; align-items: center; width: 100%; padding: 12px 0; ">
                                        <div style="flex-grow: 1; height: 1px; background: var(--color-border-light);"></div>
                                        <div style="margin: 0 16px; font-size: 12px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.5px;">${getCenturyRoman(currentCentury)} ${i18n.t("time.century") || "століття"}</div>
                                        <div style="flex-grow: 1; height: 1px; background: var(--color-border-light);"></div>
                                    </li>
                                `;
                            }
                        }

                        let dateStr = "";
                        const d = evt.gregorian.day;
                        const m = evt.gregorian.month;
                        const y = evt.gregorian.year;
                        
                        let cleanedYearStr = evt.original.yearStr ? evt.original.yearStr.replace(/\b\d{2}\.(\d{4})\b/g, '$1') : "";
                        if (cleanedYearStr && (!d && !m)) {
                            dateStr = escapeHtml(cleanedYearStr);
                        } else {
                            if (d) dateStr += escapeHtml(d) + " ";
                            if (m) dateStr += escapeHtml(getMonthNameSafe(m, !d)) + " ";
                            if (cleanedYearStr) {
                                dateStr += escapeHtml(cleanedYearStr);
                            } else if (y) {
                                dateStr += escapeHtml(y);
                            }
                        }
                        
                        if (evt.original.isOldStyle) {
                            let oldStr = "";
                            if (evt.original.day) oldStr += escapeHtml(evt.original.day) + " ";
                            if (evt.original.month) oldStr += escapeHtml(getMonthNameSafe(evt.original.month, !evt.original.day)) + " ";
                            oldStr += i18n.t("time.oldStyle") || "за ст. ст.";
                            dateStr += "<br><span class='event-date--old-style' style='color: var(--color-text-muted); font-size: 0.9em; display: inline-block; margin-top: 2px;'>(" + oldStr + ")</span>";
                        }
                        
                        const getPersonPIB = (p, eventType) => {
                            if (!p) return "Невідомо";
                            const details = findPersonDetails(p.id, window.app?.engine);
                            if (!details) return p.name || "Невідомо";
                            let s = details.surname || "";
                            let n = details.name || "";
                            let pat = details.patronymic || "";
                            
                            const isFem = details.gender === "f" || details.gender === "ж";
                            if (["birth", "baptism", "marriage"].includes(eventType)) {
                                if (isFem) s = details.maidenName ? details.maidenName : "";
                            } else if (["death", "funeral"].includes(eventType)) {
                                if (isFem) {
                                    if (details.marriedName) {
                                        const mSurnames = String(details.marriedName).split(/[,;]/).map(x => x.trim()).filter(Boolean);
                                        if (mSurnames.length > 0) s = mSurnames[mSurnames.length - 1];
                                        else s = details.maidenName ? details.maidenName : "";
                                    } else {
                                        s = details.maidenName ? details.maidenName : "";
                                    }
                                }
                            } else {
                                if (isFem) s = details.maidenName ? details.maidenName : "";
                            }
                            
                            const fullName = [s, n, pat].filter(Boolean).join(" ");
                            return fullName || p.name || "Невідомо";
                        };
                        
                        let namesStr = `<a href="?id=${encodeURIComponent(evt.person.id)}&view=profile" class="analytics-person-link js-stop-prop" data-pid="${evt.person.id}" style="color: var(--color-text-main); text-decoration: none; font-weight: 500;">${escapeHtml(getPersonPIB(evt.person, evt.type))}</a>`;
                        if (evt.type === "marriage" && evt.spouse) {
                            namesStr += ` та <a href="?id=${encodeURIComponent(evt.spouse.id)}&view=profile" class="analytics-person-link js-stop-prop" data-pid="${evt.spouse.id}" style="color: var(--color-text-main); text-decoration: none; font-weight: 500;">${escapeHtml(getPersonPIB(evt.spouse, evt.type))}</a>`;
                        }
                        
                        html += `
                            <li style="padding: 12px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 8px; list-style: none;">
                                <div style="font-weight: 600; font-size: 15px; margin-bottom: 6px; color: var(--color-text-main); line-height: 1.3;">${dateStr}</div>
                                <div style="font-size: 14px; color: var(--color-text-main); line-height: 1.4;">
                                    <span style="color: var(--color-text-muted); font-weight: 500;">${typeLabels[evt.type] || evt.type}:</span> ${namesStr}
                                </div>
                            </li>
                        `;
                    });
                }
                if (timelineList) {
                    timelineList.innerHTML = html;
                    
                    let tocLinksHtml = Array.from(tocCenturies).sort((a, b) => b - a).map(c => `<li><a href="#timeline-century-${c}" class="profile-toc-link js-scroll-to">${getCenturyRoman(c)} ${i18n.t("time.century") || "століття"}</a></li>`).join('');
                    
                    let sidebar = timelineList.closest('.events-layout-with-sidebar') ? timelineList.closest('.events-layout-with-sidebar').querySelector('.events-sidebar-desktop') : null;
                    if (!sidebar) {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'events-layout-with-sidebar';
                        wrapper.style.cssText = 'position: relative; width: 100%;';
                        
                        sidebar = document.createElement('aside');
                        sidebar.className = 'events-sidebar-desktop';
                        
                        const bodyBlocks = document.createElement('div');
                        bodyBlocks.className = 'events-body-blocks';
                        
                        
                        
                        timelineList.parentNode.insertBefore(wrapper, timelineList);
                        wrapper.appendChild(sidebar);
                        wrapper.appendChild(bodyBlocks);
                        bodyBlocks.appendChild(timelineList);
                        const chartEl = document.getElementById("analytics-timeline-chart");
                        if (chartEl) bodyBlocks.appendChild(chartEl);


                    }
                    
                    sidebar.innerHTML = `
                        <div>
                            <div class="profile-toc-container">
                                <h3 class="profile-toc-title">${(i18n.t("time.century") || "століття").toUpperCase()}</h3>
                                <ul class="profile-toc-list">
                                    ${tocLinksHtml}
                                </ul>
                            </div>
                        </div>
                    `;
                    
                    const isDesktop = window.innerWidth >= 1200;
                    sidebar.style.display = isDesktop && tocCenturies.size > 0 ? 'block' : 'none';
                    
                    sidebar.querySelectorAll('.js-scroll-to').forEach(link => {
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            const targetId = link.getAttribute('href').substring(1);
                            const targetEl = document.getElementById(targetId);
                            if (targetEl) {
                                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        });
                    });
                }
                
                // Attach events to newly generated links
// delegated to router
            };
            
            renderTimeline();
            
            const btnSort = document.getElementById("timeline-sort-btn");
            if (btnSort) {
                btnSort.addEventListener("click", () => {
                    sortDesc = !sortDesc;
                    btnSort.innerHTML = sortDesc ? '<i class="ri-sort-desc"></i>' : '<i class="ri-sort-asc"></i>';
                    renderTimeline();
                });
            }
            
            const selectFilter = document.getElementById("timeline-filter-type");
            const filterIcon = document.querySelector(".timeline-filter-icon");
            if (selectFilter) {
                let isOpen = false;
                
                const closeSelect = () => {
                    isOpen = false;
                    if (filterIcon) filterIcon.style.transform = "rotate(0deg)";
                };
                
                selectFilter.addEventListener("mousedown", () => {
                    isOpen = !isOpen;
                    if (filterIcon) filterIcon.style.transform = isOpen ? "rotate(180deg)" : "rotate(0deg)";
                });
                selectFilter.addEventListener("blur", closeSelect);
                
                selectFilter.addEventListener("change", (e) => {
                    currentFilter = e.target.value;
                    closeSelect();
                    renderTimeline();
                });
            }
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
