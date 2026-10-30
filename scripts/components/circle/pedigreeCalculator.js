// ./scripts/components/circle/pedigreeCalculator.js

import { findPersonDetails } from "../../utils/personUtils.js";

/**
 * Отримує назву спорідненості за номером Sosa-Stradonitz
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
	if (gen === 4) {
		return isMale ? "Пра²дід" : "Пра²баба";
	}
	if (gen === 5) {
		return isMale ? "Пра³дід" : "Пра³баба";
	}
	if (gen === 6) {
		return isMale ? "Пра⁴дід" : "Пра⁴баба";
	}
	if (gen === 7) {
		return isMale ? "Пра⁵дід" : "Пра⁵баба";
	}
	if (gen === 8) {
		return isMale ? "Пра⁶дід" : "Пра⁶баба";
	}

	return isMale ? `Пра${gen - 2}дід` : `Пра${gen - 2}баба`;
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
		// Батьківська лінія (ліва півсфера: від 270° проти годинникової стрілки до 90°)
		start = 270 - (idx + 1) * span;
		end = 270 - idx * span;
	} else {
		// Материнська лінія (права півсфера: від 270° за годинниковою стрілкою до 90°/450°)
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
		return cur - 3; // 4->1, 5->2, 6->3, 7->4
	}
	return 1;
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

			const sectorData = {
				sosa,
				generation: gen,
				side,
				quadrant,
				gender,
				personId,
				isKnown,
				person: personDetails,
				kinshipTitle: getKinshipTitle(sosa, gender),
				hasRecords: recordsCount > 0,
				recordsCount,
				angles,
			};

			sectors.push(sectorData);
			sosaMap.set(sosa, sectorData);
		}

		generations.push({
			generation: gen,
			count: 1 << gen,
			knownCount: knownInGen,
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
