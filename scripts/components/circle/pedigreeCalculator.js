// ./scripts/components/circle/pedigreeCalculator.js

import { findPersonDetails, resolveStatus, parseConfirmations } from "../../utils/personUtils.js";

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
 * Отримує номер Sosa цільового предка для обраної гілки (1..7)
 * @param {string} lineageMode
 * @returns {number}
 */
export function getLineageBranchTargetSosa(lineageMode) {
	return getLineageFilterConfig(lineageMode).subRootSosa;
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
 * Отримує назву рівня за реальними секторами цього кільця
 */
export function getGenerationRibbonLabelBySectors(gen, sectors, lineageMode, isRootProband) {
	if (gen === 0) {
		return isRootProband ? "Я" : "Пробанд";
	}
	if (!sectors || sectors.length === 0) {
		return `Покоління ${gen}`;
	}

	// Транзитне суцільне кільце 360° для одного предка
	if (sectors.length === 1 && sectors[0].angles.span >= 359.9) {
		const sosa = sectors[0].sosa;
		if (sosa === 2) return "Батько";
		if (sosa === 3) return "Мати";
		if (sosa === 4) return "Дідо (по татові)";
		if (sosa === 5) return "Баба (по татові)";
		if (sosa === 6) return "Дідо (по мамі)";
		if (sosa === 7) return "Баба (по мамі)";
		if (sosa >= 8 && sosa <= 15) return sosa % 2 === 0 ? "Прадід" : "Прабаба";
		if (sosa >= 16) {
			const n = Math.floor(Math.log2(sosa)) - 2;
			return sosa % 2 === 0 ? `Пра(${n})дід` : `Пра(${n})баба`;
		}
	}

	// Покоління з бінарним розгалуженням
	const validSosas = sectors.map((s) => s.sosa).filter(Boolean);
	if (validSosas.length === 0) {
		return `Покоління ${gen}`;
	}

	const minSosa = Math.min(...validSosas);
	const gRel = Math.floor(Math.log2(minSosa));

	if (gRel === 1) return "Батьки";
	if (gRel === 2) {
		if (isRootProband) {
			const targetSosa = getLineageBranchTargetSosa(lineageMode);
			if (targetSosa === 2) return "Дідусі (по татові)";
			if (targetSosa === 3) return "Дідусі (по мамі)";
		}
		return "Дідусі";
	}
	if (gRel === 3) return "Прадідусі";
	const n = gRel - 2;
	return `Пра(${n})дідусі`;
}

/**
 * Розраховує полярні кути (у градусах) для сектора предка (для зворотної сумісності)
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

	const count = 1 << gen;
	const idx = sosa - count;
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
 * Допоміжна функція отримання батьків особи з engine
 * Гарантує, що якщо вказаний тільки один з батьків (батько або мати),
 * він не буде дублюватися у слот протилежної статі.
 */
export function getParentsOfPerson(engine, pid) {
	if (!pid) return { fatherId: null, motherId: null };
	const cleanPid = String(pid).trim();
	let fId = null;
	let mId = null;

	const parentCandidates = new Set();

	// 1. Отримання батьків з engine.getParents
	if (engine && typeof engine.getParents === "function") {
		const pList = engine.getParents(cleanPid) || [];
		for (const p of pList) {
			if (p) parentCandidates.add(String(p).trim());
		}
	}

	// 2. Отримання батьків з вузла персони
	const pNode = engine?.getPerson ? engine.getPerson(cleanPid) : null;
	if (pNode?.parents && Array.isArray(pNode.parents)) {
		for (const p of pNode.parents) {
			if (p) parentCandidates.add(String(p).trim());
		}
	}

	// 3. Розподіл кандидатів строго за статтю
	for (const candidateId of parentCandidates) {
		const candidate = engine?.getPerson ? engine.getPerson(candidateId) : null;
		const g = candidate?.gender ? String(candidate.gender).trim().toLowerCase() : "";
		if (g === "m" && !fId) {
			fId = candidateId;
		} else if (g === "f" && !mId) {
			mId = candidateId;
		}
	}

	// 4. Додаткова перевірка через familyRoles (parents_bio: "father_id;mother_id")
	if ((!fId || !mId) && engine?.db) {
		const roles = engine.db.familyRoles || [];
		const rRow = roles.find((r) => String(r.person_id).trim() === cleanPid);
		if (rRow && rRow.parents_bio) {
			const parts = String(rRow.parents_bio).split(";");
			const bioF = parts[0] ? parts[0].trim() : null;
			const bioM = parts[1] ? parts[1].trim() : null;

			if (bioF && !fId) {
				const candF = engine?.getPerson ? engine.getPerson(bioF) : null;
				const gF = candF?.gender ? String(candF.gender).trim().toLowerCase() : "";
				// Чоловік або невідома стать, але точно не жінка
				if (gF !== "f") fId = bioF;
			}
			if (bioM && !mId) {
				const candM = engine?.getPerson ? engine.getPerson(bioM) : null;
				const gM = candM?.gender ? String(candM.gender).trim().toLowerCase() : "";
				// Жінка або невідома стать, але точно не чоловік
				if (gM !== "m") mId = bioM;
			}
		}
	}

	// 5. Захист від дублювання: одна особа не може бути одночасно і батьком, і матір'ю
	if (fId && mId && fId === mId) {
		const samePerson = engine?.getPerson ? engine.getPerson(fId) : null;
		const g = samePerson?.gender ? String(samePerson.gender).trim().toLowerCase() : "";
		if (g === "f") {
			fId = null;
		} else {
			mId = null;
		}
	}

	return { fatherId: fId, motherId: mId };
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
 * Реалізує універсальну модель фільтрації гілок та розрахунку кутової геометрії:
 * - Усі 7 режимів гілок жорстко прив'язані до глобального кореня дерева — Індекса 1 (Root_1).
 * - Навколо Індекса 1 формуються транзитні суцільні кільця 360° до досягнення кореня гілки BranchTarget.
 * - При досягненні BranchTarget розгортається бінарне розгалуження (батько 180°, мати 180°), далі 90° тощо.
 * - При зміні пробанда на іншу особу фільтр гілки зберігає свою прив'язку до Індекса 1.
 * 
 * @param {object} engine - FamilyEngine instance
 * @param {string|number} currentPersonId - особа в центрі діаграми
 * @param {number} maxGenerations - скільки кілець будувати (0..6 = 7 поколінь)
 * @param {string} lineageMode - режим лінії роду (all, father, mother, fatherFather, тощо)
 * @param {string|number} rootPersonId - глобальний корінь дерева (Індекс 1)
 * @returns {object} Структуровані дані для рендерингу
 */
export function buildPedigreeData(engine, currentPersonId, maxGenerations = 6, lineageMode = "all", rootPersonId = null) {
	// 1. Визначення глобального кореня (Root_1) та поточного пробанда
	const root1Id = String(rootPersonId || engine?.rootPersonId || currentPersonId).trim();
	const curIdStr = String(currentPersonId || root1Id).trim();

	// 2. Визначення цільового предка гілки (BranchTarget B: 1..7)
	const targetSosa = getLineageBranchTargetSosa(lineageMode);

	// 3. Побудова карти предків Ahnentafel 1..7 для Root_1
	const ahnentafelMap = new Map();
	ahnentafelMap.set(1, root1Id);

	const p1 = getParentsOfPerson(engine, root1Id);
	if (p1.fatherId) ahnentafelMap.set(2, p1.fatherId);
	if (p1.motherId) ahnentafelMap.set(3, p1.motherId);

	if (p1.fatherId) {
		const p2 = getParentsOfPerson(engine, p1.fatherId);
		if (p2.fatherId) ahnentafelMap.set(4, p2.fatherId);
		if (p2.motherId) ahnentafelMap.set(5, p2.motherId);
	}

	if (p1.motherId) {
		const p3 = getParentsOfPerson(engine, p1.motherId);
		if (p3.fatherId) ahnentafelMap.set(6, p3.fatherId);
		if (p3.motherId) ahnentafelMap.set(7, p3.motherId);
	}

	// 4. Побудова транзитного ланцюжка (path) від Root_1 до BranchTarget
	let rawPathSosas = [1];
	if (targetSosa === 2) rawPathSosas = [1, 2];
	else if (targetSosa === 3) rawPathSosas = [1, 3];
	else if (targetSosa === 4) rawPathSosas = [1, 2, 4];
	else if (targetSosa === 5) rawPathSosas = [1, 2, 5];
	else if (targetSosa === 6) rawPathSosas = [1, 3, 6];
	else if (targetSosa === 7) rawPathSosas = [1, 3, 7];

	const path = [];
	const pathSosas = [];
	for (const s of rawPathSosas) {
		const pid = ahnentafelMap.get(s);
		if (pid) {
			path.push(pid);
			pathSosas.push(s);
		} else {
			break;
		}
	}

	const targetId = path.length > 0 ? path[path.length - 1] : null;

	// 5. Збір усіх предків цільової особи BranchTarget (для визначення приналежності гілці)
	const branchAncestorsSet = new Set();
	if (targetId) {
		const q = [targetId];
		while (q.length > 0) {
			const curr = q.shift();
			const { fatherId, motherId } = getParentsOfPerson(engine, curr);
			if (fatherId && !branchAncestorsSet.has(fatherId)) {
				branchAncestorsSet.add(fatherId);
				q.push(fatherId);
			}
			if (motherId && !branchAncestorsSet.has(motherId)) {
				branchAncestorsSet.add(motherId);
				q.push(motherId);
			}
		}
	}

	// 6. Індексація гео-локацій (places.csv)
	const placesMap = new Map();
	const rawPlaces = engine?.db?.places || [];
	if (Array.isArray(rawPlaces)) {
		for (let i = 0; i < rawPlaces.length; i++) {
			const p = rawPlaces[i];
			const id = String(p.place_id || p.id || "").trim();
			if (id) placesMap.set(id, p.name_current || p.name || id);
		}
	}

	// Індексація народжень (birth.csv)
	const birthMap = new Map();
	const rawBirth = engine?.db?.birth || [];
	if (Array.isArray(rawBirth)) {
		for (let i = 0; i < rawBirth.length; i++) {
			const b = rawBirth[i];
			const pid = String(b.person_id || b.id || "").trim();
			if (pid && !birthMap.has(pid)) birthMap.set(pid, b);
		}
	}

	// Індексація смертей (death.csv)
	const deathMap = new Map();
	const rawDeath = engine?.db?.deaths || engine?.db?.death || [];
	if (Array.isArray(rawDeath)) {
		for (let i = 0; i < rawDeath.length; i++) {
			const d = rawDeath[i];
			const pid = String(d.person_id || d.id || "").trim();
			if (pid && !deathMap.has(pid)) deathMap.set(pid, d);
		}
	}

	// Індексація наявності записів та нагород
	const recordsMap = new Map();
	const rawRecords = engine?.db?.records || [];
	if (Array.isArray(rawRecords)) {
		for (let i = 0; i < rawRecords.length; i++) {
			const pid = String(rawRecords[i].person_id || rawRecords[i].id || "").trim();
			if (pid) recordsMap.set(pid, (recordsMap.get(pid) || 0) + 1);
		}
	}
	const rawAwards = engine?.db?.awards || [];
	if (Array.isArray(rawAwards)) {
		for (let i = 0; i < rawAwards.length; i++) {
			const pid = String(rawAwards[i].person_id || rawAwards[i].personId || "").trim();
			if (pid) recordsMap.set(pid, (recordsMap.get(pid) || 0) + 1);
		}
	}

	// 7. Базовий номер Sosa для CurrentProband у його віялі ЗАВЖДИ дорівнює 1.
	// Це гарантує, що для будь-якої центральної особи кільце 1 — це її Батьки (Sosa 2, 3),
	// кільце 2 — Дідусі (Sosa 4..7), кільце 3 — Прадідусі (Sosa 8..15) тощо.
	const probandSosa = 1;

	// 8. Рекурсивна побудова секторів за універсальною кутовою моделлю
	const ringsData = Array.from({ length: maxGenerations + 1 }, () => []);
	const sosaMap = new Map();
	const allSectors = [];
	const personIdToSosa = new Map();
	let totalKnown = 0;
	let deepestGeneration = 0;

	function buildFanNodes(personId, sosa, ringIndex, startAngle, endAngle, isFullRing, hemisphere) {
		if (ringIndex > maxGenerations) return;

		const isKnown = !!personId;
		let personDetails = null;

		if (isKnown) {
			totalKnown++;
			if (ringIndex > deepestGeneration) deepestGeneration = ringIndex;
			personDetails = findPersonDetails(personId, engine);
			personIdToSosa.set(String(personId), sosa);
		}

		// Визначення статі
		let gender = "u";
		if (ringIndex === 0) {
			gender = personDetails?.gender || engine?.getPerson?.(curIdStr)?.gender || "m";
		} else {
			gender = sosa % 2 === 0 ? "m" : "f";
		}

		const span = Math.abs(endAngle - startAngle);
		const mid = span >= 359.9 ? 270 : (startAngle + endAngle) / 2;

		// 3 рівні підтвердження зв'язку та документальні підтвердження
		const rawBase = isKnown ? engine?.db?.basic?.find((r) => String(r.person_id || r.id) === personId) : null;
		const rawConf = personDetails?.sources || personDetails?.confirmations || personDetails?.grounds || rawBase?.sources || rawBase?.confirmations || rawBase?.grounds || rawBase?.["джерела"] || rawBase?.["підтвердження"] || rawBase?.["документальні підтвердження"] || rawBase?.["підстави"] || rawBase?.["підстави зв'язку"] || "";
		const confirmationsList = personDetails?.confirmationsList?.length ? personDetails.confirmationsList : parseConfirmations(rawConf);
		const rawStatus = rawBase?.status !== undefined ? rawBase.status : (personDetails?.rawStatus || personDetails?.status || "");
		
		// Пробанд (Індекс 1) є нульовою аксіоматичною точкою родоводу ("Я") і ЗАВЖДИ підтверджений за замовчуванням
		const isProband = ringIndex === 0 || sosa === 1 || String(personId).trim() === root1Id || String(personId).trim() === "1";
		let localStatus = isProband ? "confirmed" : resolveStatus(rawStatus, rawConf, isProband); // "confirmed" | "indirect" | "hypothetical"

		// Ланцюгова валідація відносно Пробанда (Root): "Ланцюг не міцніший за найслабшу ланку"
		let chainStatus = localStatus;
		let weakestLink = null;

		if (isProband) {
			localStatus = "confirmed";
			chainStatus = "confirmed";
			weakestLink = null;
		} else {
			const childSosa = Math.floor(sosa / 2);
			const childSector = sosaMap.get(childSosa);
			const childChain = childSector ? childSector.chainStatus : "confirmed";

			if (childChain === "hypothetical" || localStatus === "hypothetical") {
				chainStatus = "hypothetical";
				weakestLink = childChain === "hypothetical"
					? childSector.weakestLink
					: {
						sosa,
						personId,
						name: [personDetails?.name || personDetails?.first_name, personDetails?.surname || personDetails?.last_name].filter(Boolean).join(" ") || `Особа №${sosa}`,
						kinshipTitle: getKinshipTitle(sosa, gender),
						status: "hypothetical",
					};
			} else if (childChain === "indirect" || localStatus === "indirect") {
				chainStatus = "indirect";
				weakestLink = childChain === "indirect"
					? childSector.weakestLink
					: {
						sosa,
						personId,
						name: [personDetails?.name || personDetails?.first_name, personDetails?.surname || personDetails?.last_name].filter(Boolean).join(" ") || `Особа №${sosa}`,
						kinshipTitle: getKinshipTitle(sosa, gender),
						status: "indirect",
					};
			} else {
				chainStatus = "confirmed";
				weakestLink = null;
			}
		}

		const isConfirmed = isKnown && (isProband || chainStatus === "confirmed");
		const isIndirect = isKnown && !isProband && chainStatus === "indirect";
		const isHypothetical = isKnown && !isProband && chainStatus === "hypothetical";

		// Дати та місця народження / смерті
		const birthEvent = isKnown ? birthMap.get(personId) : null;
		const deathEvent = isKnown ? deathMap.get(personId) : null;
		const birthData = formatEventData(birthEvent, true, rawBase, placesMap);
		const deathData = formatEventData(deathEvent, false, rawBase, placesMap);

		let lifeYears = "";
		if (birthData.year && deathData.year) lifeYears = `${birthData.year} — ${deathData.year}`;
		else if (birthData.year) lifeYears = `нар. ${birthData.year}`;
		else if (deathData.year) lifeYears = `пом. ${deathData.year}`;

		const sectorData = {
			sosa,
			generation: ringIndex,
			side: hemisphere,
			quadrant: getQuadrant(sosa),
			gender,
			personId: personId || null,
			isKnown,
			isConfirmed,
			isIndirect,
			isHypothetical,
			confirmationStatus: chainStatus, // для контуру дуги віяла
			localStatus, // локальний статус документального батьківства
			chainStatus, // ефективний статус відносно Пробанда
			weakestLink, // найслабша ланка в ланцюгу
			confirmations: rawConf,
			confirmationsList,
			person: personDetails,
			kinshipTitle: getKinshipTitle(sosa, gender),
			hasRecords: isKnown && (recordsMap.get(personId) || 0) > 0,
			recordsCount: isKnown ? recordsMap.get(personId) || 0 : 0,
			angles: { start: startAngle, end: endAngle, span, mid },
			birth: birthData,
			death: deathData,
			lifeYears,
		};

		ringsData[ringIndex].push(sectorData);
		sosaMap.set(sosa, sectorData);
		allSectors.push(sectorData);

		// Якщо досягнуто максимального покоління або слот порожній — зупиняємо розгалуження
		if (ringIndex === maxGenerations || !isKnown) {
			return;
		}

		const pidStr = String(personId);
		const idxInPath = path.indexOf(pidStr);

		// Випадок 1: Транзитне кільце 360° (перебуваємо на ланцюжку до BranchTarget і ще не дійшли кінця)
		if (idxInPath !== -1 && idxInPath < path.length - 1) {
			const nextPid = path[idxInPath + 1];
			const parents = getParentsOfPerson(engine, pidStr);
			const isFather = String(parents.fatherId || "").trim() === String(nextPid).trim();
			const nextSosa = isFather ? 2 * sosa : 2 * sosa + 1;
			const nextHemi = isFather ? "paternal" : "maternal";

			buildFanNodes(nextPid, nextSosa, ringIndex + 1, 0, 360, true, nextHemi);
			return;
		}

		// Випадок 2: Бінарне розгалуження (особа є самим BranchTarget, або його прямим предком, або режим ALL)
		const isAtOrAboveTarget = (pidStr === targetId) || branchAncestorsSet.has(pidStr) || (targetSosa === 1);
		if (isAtOrAboveTarget) {
			const { fatherId, motherId } = getParentsOfPerson(engine, pidStr);

			if (isFullRing) {
				// Перший бінарний поділ після суцільного 360°-кільця:
				// Батько отримує ліву півсферу [90°, 270°] (180°), Мати — праву [270°, 450°] (180°)
				buildFanNodes(fatherId, 2 * sosa, ringIndex + 1, 90, 270, false, "paternal");
				buildFanNodes(motherId, 2 * sosa + 1, ringIndex + 1, 270, 450, false, "maternal");
			} else {
				// Наступні бінарні поділи: сектор ділиться навпіл
				const midAngle = (startAngle + endAngle) / 2;
				let fatherStart, fatherEnd, motherStart, motherEnd;

				if (hemisphere === "paternal") {
					// Ліва півсфера: батько ближче до 270° (верх), мати ближче до 90° (низ)
					fatherStart = midAngle;
					fatherEnd = endAngle;
					motherStart = startAngle;
					motherEnd = midAngle;
				} else {
					// Права півсфера: батько ближче до 270° (верх), мати ближче до 450° (низ)
					fatherStart = startAngle;
					fatherEnd = midAngle;
					motherStart = midAngle;
					motherEnd = endAngle;
				}

				buildFanNodes(fatherId, 2 * sosa, ringIndex + 1, fatherStart, fatherEnd, false, "paternal");
				buildFanNodes(motherId, 2 * sosa + 1, ringIndex + 1, motherStart, motherEnd, false, "maternal");
			}
			return;
		}

		// Випадок 3: Особа за межами обраної гілки (не розгалужуємо)
	}

	// Запуск рекурсії від центрального пробанда (кільце 0: 360°)
	buildFanNodes(curIdStr, probandSosa, 0, 0, 360, true, "center");

	// 9. Формування масиву поколінь з коректними назвами для стрічки
	const generations = [];
	for (let gen = 0; gen <= maxGenerations; gen++) {
		const sectors = ringsData[gen] || [];
		const knownInGen = sectors.filter((s) => s.isKnown).length;
		const label = getGenerationRibbonLabelBySectors(gen, sectors, lineageMode, curIdStr === root1Id);

		generations.push({
			generation: gen,
			count: sectors.length,
			knownCount: knownInGen,
			label,
			sectors,
		});
	}

	return {
		rootPersonId: root1Id,
		currentPersonId: curIdStr,
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
