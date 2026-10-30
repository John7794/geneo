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
	if (sosa === 1) return "Ви";
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
 * @returns {string}
 */
export function getGenerationRibbonLabel(gen) {
	if (gen === 0) return "Ви";
	if (gen === 1) return "Батьки";
	if (gen === 2) return "Дідусі";
	if (gen === 3) return "Прадідусі";
	const n = gen - 2;
	return `Пра(${n})дідусі`;
}

/**
 * Розраховує полярні кути (у градусах) для сектора предка
 * 270° — це 12:00 (верхній промінь).
 * Ліва півсфера (270° проти годинникової стрілки до 90°) — Батьківська лінія.
 * Права півсфера (270° за годинниковою стрілкою до 90°) — Материнська лінія.
 * @param {number} sosa
 * @param {number} gen
 * @returns {{ start: number, end: number, span: number, mid: number }}
 */
export function calculateSectorAngles(sosa, gen) {
	if (gen === 0) {
		return { start: 0, end: 360, span: 360, mid: 0 };
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
 * @param {number} maxGenerations - скільки поколінь будувати (за замовчуванням 7, тобто 0..7 = 8 поколінь)
 * @returns {object} Структуровані дані для рендерингу
 */
export function buildPedigreeData(engine, rootPersonId, maxGenerations = 7) {
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

	// Поколінний обхід
	const generations = [];
	let totalKnown = 0;
	let deepestGeneration = 0;

	for (let gen = 0; gen <= maxGenerations; gen++) {
		const startSosa = 1 << gen;
		const endSosa = (1 << (gen + 1)) - 1;
		const sectors = [];
		let knownInGen = 0;

		for (let sosa = startSosa; sosa <= endSosa; sosa++) {
			const personId = sosaToPersonId.get(sosa) || null;
			const isKnown = !!personId;
			let personDetails = null;

			if (isKnown) {
				knownInGen++;
				totalKnown++;
				if (gen > deepestGeneration) deepestGeneration = gen;

				personDetails = findPersonDetails(personId, engine);

				// Пошук батьків для наступного покоління
				if (gen < maxGenerations) {
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
				const count = 1 << gen;
				const idx = sosa - count;
				side = idx < count / 2 ? "paternal" : "maternal";
			}

			const angles = calculateSectorAngles(sosa, gen);
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
		}

		generations.push({
			generation: gen,
			count: 1 << gen,
			knownCount: knownInGen,
			label: getGenerationRibbonLabel(gen),
			sectors,
		});
	}

	return {
		rootPersonId: rootIdStr,
		maxGenerations,
		deepestGeneration,
		totalKnown,
		generations,
		sosaMap,
		personIdToSosa,
	};
}
