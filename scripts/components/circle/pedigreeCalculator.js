// ./scripts/components/circle/pedigreeCalculator.js

import { findPersonDetails } from "../../utils/personUtils.js";

/**
 * Отримує назву спорідненості за номером Sosa-Stradonitz згідно зі схемою проєкту:
 * пра(n)дід, пра(n)баба, де n — число від 2 до n рівнів.
 * @param {number} sosa 
 * @param {'m'|'f'|'u'} gender 
 * @returns {string}
 */
export function getKinshipTitle(sosa, gender = "m") {
	if (sosa === 1) return "Пробанд";
	if (sosa === 2) return "Батько";
	if (sosa === 3) return "Мати";

	const gen = Math.floor(Math.log2(sosa));
	const isMale = sosa % 2 === 0;

	if (gen === 2) {
		const side = sosa < 6 ? "(по батькові)" : "(по матері)";
		return `${isMale ? "Дід" : "Баба"} ${side}`;
	}
	if (gen === 3) {
		return isMale ? "Прадід" : "Прабаба";
	}
	
	// Починаючи з 4-го покоління (прапрадідусі): n = gen - 2
	const n = gen - 2;
	return isMale ? `Пра(${n})дід` : `Пра(${n})баба`;
}

/**
 * Отримує назву рівня для стрічки фільтрації поколінь
 * @param {number} gen 
 * @param {string} lineageMode
 * @returns {string}
 */
export function getGenerationRibbonLabel(gen, lineageMode = "all") {
	if (gen === 0) return "Пробанд";
	const config = getLineageFilterConfig(lineageMode);
	if (config.subRootGen > 0) {
		if (gen === 1) {
			if (config.subRootSosa === 2 || config.subRootSosa === 4 || config.subRootSosa === 5) {
				return "Батько";
			}
			return "Мати";
		}
		if (gen === 2) {
			if (config.subRootSosa === 4) return "Дідо (по татові)";
			if (config.subRootSosa === 5) return "Баба (по татові)";
			if (config.subRootSosa === 6) return "Дідо (по мамі)";
			if (config.subRootSosa === 7) return "Баба (по мамі)";
			if (config.subRootSosa === 2) return "Дідусі (по татові)";
			if (config.subRootSosa === 3) return "Дідусі (по мамі)";
		}
	}
	if (gen === 1) return "Батьки";
	if (gen === 2) return "Дідусі";
	if (gen === 3) return "Прадідусі";
	const n = gen - 2;
	return `Пра(${n})дідусі`;
}

/**
 * Конфігурація для фільтрації ліній роду (Lineage mode)
 * @param {string} lineageMode 
 * @returns {{ subRootSosa: number, subRootGen: number }}
 */
export function getLineageFilterConfig(lineageMode = "all") {
	const mode = String(lineageMode || "all").trim();
	switch (mode) {
		case "father":
		case "paternal":
			return { subRootSosa: 2, subRootGen: 1 };
		case "mother":
		case "maternal":
			return { subRootSosa: 3, subRootGen: 1 };
		case "fatherFather":
		case "paternal_f":
			return { subRootSosa: 4, subRootGen: 2 };
		case "fatherMother":
		case "paternal_m":
			return { subRootSosa: 5, subRootGen: 2 };
		case "motherFather":
		case "maternal_f":
			return { subRootSosa: 6, subRootGen: 2 };
		case "motherMother":
		case "maternal_m":
			return { subRootSosa: 7, subRootGen: 2 };
		default:
			return { subRootSosa: 1, subRootGen: 0 };
	}
}

/**
 * Розраховує полярні кути (у градусах) для сектора предка
 * 270° — це 12:00 (верхній промінь).
 * Ліва півсфера (270° проти годинникової стрілки до 90°) — Батьківська лінія.
 * Права півсфера (270° за годинниковою стрілкою до 90°) — Материнська лінія.
 * @param {number} sosa
 * @param {number} gen
 * @param {string} lineageMode
 * @returns {{ start: number, end: number, span: number, mid: number }}
 */
export function calculateSectorAngles(sosa, gen, lineageMode = "all") {
	if (gen === 0) {
		return { start: 0, end: 360, span: 360, mid: 0 };
	}

	const config = getLineageFilterConfig(lineageMode);

	if (config.subRootGen > 0) {
		if (gen <= config.subRootGen) {
			// Огортає пробанда / попереднє покоління повним кільцем 360°
			return { start: 0, end: 360, span: 360, mid: 270 };
		}

		const d = gen - config.subRootGen;
		const N = 1 << d;
		const startSosa = config.subRootSosa << d;
		const idx = sosa - startSosa;
		const span = 360 / N;

		let start, end;
		if (idx < N / 2) {
			start = 270 - (idx + 1) * span;
			end = 270 - idx * span;
		} else {
			const mIdx = idx - N / 2;
			start = 270 + mIdx * span;
			end = 270 + (mIdx + 1) * span;
		}

		const mid = (start + end) / 2;
		return { start, end, span, mid };
	}

	const count = 1 << gen; // 2^gen секторів у поколінні
	const idx = sosa - count; // 0 .. count - 1
	const span = 360 / count;

	let start, end;
	if (idx < count / 2) {
		start = 270 - (idx + 1) * span;
		end = 270 - idx * span;
	} else {
		const mIdx = idx - count / 2;
		start = 270 + mIdx * span;
		end = 270 + (mIdx + 1) * span;
	}

	const mid = (start + end) / 2;
	return { start, end, span, mid };
}

/**
 * Визначає квадрант предка (1..4) за лініями чотирьох дідусів/бабусь
 * 1: Батьків дідо (Sosa 4+)
 * 2: Батькова баба (Sosa 5+)
 * 3: Материн дідо (Sosa 6+)
 * 4: Материна баба (Sosa 7+)
 * @param {number} sosa
 * @returns {number} 0 for proband, 1..4 for ancestors
 */
export function getQuadrant(sosa) {
	if (sosa <= 1) return 0;
	if (sosa === 2) return 1;
	if (sosa === 3) return 3;

	let cur = sosa;
	while (cur >= 8) {
		cur = Math.floor(cur / 2);
	}
	if (cur >= 4 && cur <= 7) {
		return cur - 3;
	}
	return 1;
}

/**
 * Форматує дату та місце події (народження або смерті)
 */
function formatEventData(event, isBirth, baseRow, placesMap) {
	let datePart = "";
	const day = isBirth ? event?.b_day : event?.d_day;
	const month = isBirth ? event?.b_month : event?.d_month;
	const year = isBirth ? event?.b_year : event?.d_year;
	const dateSort = event?.date_sort;

	if (day && month && year) {
		const dd = String(day).padStart(2, "0");
		const mm = String(month).padStart(2, "0");
		datePart = `${dd}.${mm}.${year}`;
	} else if (year) {
		datePart = String(year);
	} else if (dateSort && dateSort.length >= 4) {
		datePart = String(dateSort);
	} else if (isBirth && baseRow?.birth_year) {
		datePart = String(baseRow.birth_year);
	} else if (!isBirth && baseRow?.death_year) {
		datePart = String(baseRow.death_year);
	}

	let placePart = "";
	const placeId = String(event?.place_id || "").trim();
	if (placeId && placesMap.has(placeId)) {
		placePart = placesMap.get(placeId);
	} else {
		const details = isBirth ? event?.b_place_details : event?.d_place_details;
		const admin = isBirth ? event?.b_admin_division : event?.d_admin_division;
		if (details) {
			placePart = details;
		} else if (admin) {
			placePart = admin.split("/")[0].trim();
		}
	}

	const parts = [];
	if (datePart) parts.push(datePart);
	if (placePart) parts.push(placePart);

	return {
		date: datePart,
		year: year || (isBirth ? baseRow?.birth_year : baseRow?.death_year) || datePart.slice(-4),
		place: placePart,
		info: parts.join(" • "),
	};
}

/**
 * Головна функція підготовки даних для віялового кола роду (Fan Chart)
 * @param {object} engine - FamilyEngine instance
 * @param {string|number} rootPersonId
 * @param {number} maxGenerations - скільки поколінь будувати (за замовчуванням 6, тобто 0..6 = 7 поколінь)
 * @param {string} lineageMode - режим лінії роду (all, father, mother, fatherFather, тощо)
 * @returns {object} Структуровані дані для рендерингу
 */
export function buildPedigreeData(engine, rootPersonId, maxGenerations = 6, lineageMode = "all") {
	const sosaToPersonId = new Map();
	const personIdToSosa = new Map();
	const sosaMap = new Map();

	const rootIdStr = String(rootPersonId).trim();
	sosaToPersonId.set(1, rootIdStr);
	personIdToSosa.set(rootIdStr, 1);

	// Швидка індексація гео-локацій (places.csv)
	const placesMap = new Map();
	const rawPlaces = engine?.db?.places || [];
	if (Array.isArray(rawPlaces)) {
		for (let i = 0; i < rawPlaces.length; i++) {
			const p = rawPlaces[i];
			const id = String(p.place_id || p.id || "").trim();
			if (id) {
				placesMap.set(id, p.name_current || p.name || id);
			}
		}
	}

	// Швидка індексація народжень (birth.csv)
	const birthMap = new Map();
	const rawBirth = engine?.db?.birth || [];
	if (Array.isArray(rawBirth)) {
		for (let i = 0; i < rawBirth.length; i++) {
			const b = rawBirth[i];
			const pid = String(b.person_id || b.id || "").trim();
			if (pid && !birthMap.has(pid)) {
				birthMap.set(pid, b);
			}
		}
	}

	// Швидка індексація смертей (death.csv)
	const deathMap = new Map();
	const rawDeath = engine?.db?.deaths || engine?.db?.death || [];
	if (Array.isArray(rawDeath)) {
		for (let i = 0; i < rawDeath.length; i++) {
			const d = rawDeath[i];
			const pid = String(d.person_id || d.id || "").trim();
			if (pid && !deathMap.has(pid)) {
				deathMap.set(pid, d);
			}
		}
	}

	// Швидка індексація наявності записів та нагород
	const recordsMap = new Map();
	const rawRecords = engine?.db?.records || [];
	if (Array.isArray(rawRecords)) {
		for (let i = 0; i < rawRecords.length; i++) {
			const pid = String(rawRecords[i].person_id || rawRecords[i].id || "").trim();
			if (pid) {
				recordsMap.set(pid, (recordsMap.get(pid) || 0) + 1);
			}
		}
	}

	const rawAwards = engine?.db?.awards || [];
	if (Array.isArray(rawAwards)) {
		for (let i = 0; i < rawAwards.length; i++) {
			const pid = String(rawAwards[i].person_id || rawAwards[i].personId || "").trim();
			if (pid) {
				recordsMap.set(pid, (recordsMap.get(pid) || 0) + 1);
			}
		}
	}

	// 1. Попередній обхід: збираємо зв'язки Sosa для всіх предків до maxGenerations
	for (let gen = 0; gen < maxGenerations; gen++) {
		const startSosa = 1 << gen;
		const endSosa = (1 << (gen + 1)) - 1;

		for (let sosa = startSosa; sosa <= endSosa; sosa++) {
			const personId = sosaToPersonId.get(sosa);
			if (!personId) continue;

			const personNode = engine.getPerson(personId);
			const parentIds = personNode?.parents || [];

			for (let pIdx = 0; pIdx < parentIds.length; pIdx++) {
				const pId = String(parentIds[pIdx]).trim();
				const pNode = engine.getPerson(pId);
				const isFather = pNode?.gender === "m" || (!pNode?.gender && !sosaToPersonId.has(sosa * 2));

				if (isFather) {
					if (!sosaToPersonId.has(sosa * 2)) {
						sosaToPersonId.set(sosa * 2, pId);
						personIdToSosa.set(pId, sosa * 2);
					}
				} else {
					if (!sosaToPersonId.has(sosa * 2 + 1)) {
						sosaToPersonId.set(sosa * 2 + 1, pId);
						personIdToSosa.set(pId, sosa * 2 + 1);
					}
				}
			}
		}
	}

	// 2. Поколінний обхід з урахуванням обраної лінії роду (lineageMode)
	const config = getLineageFilterConfig(lineageMode);
	const generations = [];
	const allSectors = [];
	let totalKnown = 0;
	let deepestGeneration = 0;

	for (let gen = 0; gen <= maxGenerations; gen++) {
		const sectors = [];
		let knownInGen = 0;

		let sosaList = [];
		if (config.subRootGen === 0) {
			const startSosa = 1 << gen;
			const endSosa = (1 << (gen + 1)) - 1;
			for (let s = startSosa; s <= endSosa; s++) sosaList.push(s);
		} else if (gen === 0) {
			sosaList = [1];
		} else if (gen < config.subRootGen) {
			const s = Math.floor(config.subRootSosa / (1 << (config.subRootGen - gen)));
			sosaList = [s];
		} else if (gen === config.subRootGen) {
			sosaList = [config.subRootSosa];
		} else {
			const d = gen - config.subRootGen;
			const startSosa = config.subRootSosa << d;
			const endSosa = ((config.subRootSosa + 1) << d) - 1;
			for (let s = startSosa; s <= endSosa; s++) sosaList.push(s);
		}

		for (let sIdx = 0; sIdx < sosaList.length; sIdx++) {
			const sosa = sosaList[sIdx];
			const personId = sosaToPersonId.get(sosa) || null;
			const isKnown = !!personId;
			let personDetails = null;

			if (isKnown) {
				knownInGen++;
				totalKnown++;
				if (gen > deepestGeneration) deepestGeneration = gen;
				personDetails = findPersonDetails(personId, engine);
			}

			// Визначення статі
			let gender = "u";
			if (sosa === 1) {
				gender = personDetails?.gender || engine.getPerson(rootIdStr)?.gender || "m";
			} else {
				gender = sosa % 2 === 0 ? "m" : "f";
			}

			// Визначення гілки
			let side = "center";
			if (sosa > 1) {
				let cur = sosa;
				while (cur >= 4) {
					cur = Math.floor(cur / 2);
				}
				side = cur === 2 ? "paternal" : "maternal";
			}

			const angles = calculateSectorAngles(sosa, gen, lineageMode);
			const quadrant = getQuadrant(sosa);
			const recordsCount = personId ? recordsMap.get(personId) || 0 : 0;

			// Статус зв'язку: підтверджений чи гіпотетичний
			const rawStatus = String(personDetails?.status || "").trim().toLowerCase();
			const isConfirmed = isKnown && (
				rawStatus === "1" ||
				rawStatus === "confirmed" ||
				rawStatus === "true" ||
				rawStatus === "так" ||
				rawStatus === "+"
			);

			// Дати та місця народження / смерті
			const rawBase = personId ? engine?.db?.basic?.find(r => String(r.person_id || r.id) === personId) : null;
			const birthEvent = personId ? birthMap.get(personId) : null;
			const deathEvent = personId ? deathMap.get(personId) : null;

			const birthData = formatEventData(birthEvent, true, rawBase, placesMap);
			const deathData = formatEventData(deathEvent, false, rawBase, placesMap);

			let lifeYears = "";
			if (birthData.year && deathData.year) {
				lifeYears = `${birthData.year} — ${deathData.year}`;
			} else if (birthData.year) {
				lifeYears = `нар. ${birthData.year}`;
			} else if (deathData.year) {
				lifeYears = `пом. ${deathData.year}`;
			}

			const sectorData = {
				sosa,
				generation: gen,
				side,
				quadrant,
				gender,
				personId,
				isKnown,
				isConfirmed,
				person: personDetails,
				kinshipTitle: getKinshipTitle(sosa, gender),
				hasRecords: recordsCount > 0,
				recordsCount,
				angles,
				birth: birthData,
				death: deathData,
				lifeYears,
			};

			sectors.push(sectorData);
			sosaMap.set(sosa, sectorData);
			allSectors.push(sectorData);
		}

		generations.push({
			generation: gen,
			count: sosaList.length,
			knownCount: knownInGen,
			label: getGenerationRibbonLabel(gen, lineageMode),
			sectors,
		});
	}

	return {
		rootPersonId: rootIdStr,
		lineageMode,
		maxGenerations,
		deepestGeneration,
		totalKnown,
		generations,
		sectors: allSectors,
		sosaMap,
		personIdToSosa,
	};
}
