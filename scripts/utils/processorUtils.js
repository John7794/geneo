// ./scripts/utils/processorUtils.js

import { COLUMNS } from "../core/dbSchema.js";
import { createLookupIndex } from "./helpers.js";
import { normalizeGender } from "./genderUtils.js";

const SPLIT_IDS_REGEX = /[;,]+/;

// Винесено на рівень модуля для уникнення реініціалізації (O(1) Memory Allocation)
const EXCLUDED_HYDRATION_FIELDS = new Set([
	COLUMNS.records?.images || "images",
	COLUMNS.records?.transcription || "transcription",
]);

/**
 * РІВЕНЬ ДАНИХ: Парсить базові таблиці та створює швидкий словник (Map) осіб.
 */
export function loadPeopleMap(basicData, familyListData) {
	const peopleMap = new Map();

	const processSource = (data, source) => {
		if (!Array.isArray(data)) return;

		const isBasic = source === "basic";
		const idCol = isBasic
			? COLUMNS.basic?.id || "id"
			: COLUMNS.familyList?.id || "id";
		const nameCol = isBasic
			? COLUMNS.basic?.name || "name"
			: COLUMNS.familyList?.firstName || "first_name";
		const surCol = isBasic
			? COLUMNS.basic?.surname || "surname"
			: COLUMNS.familyList?.surname || "surname";
		const genCol = isBasic
			? COLUMNS.basic?.gender || "gender"
			: COLUMNS.familyList?.gender || "gender";

		for (let i = 0; i < data.length; i++) {
			const row = data[i];
			const rawId = row[idCol] !== undefined ? row[idCol] : row.person_id;
			const id = String(rawId || "").trim();

			if (!id) continue;

			// Оптимізація пам'яті: відмова від шаблонних рядків та .trim()
			const s = row[surCol] || "";
			const n = row[nameCol] || "";
			let fullName = "";
			if (s) fullName += s;
			if (n) fullName += (fullName ? " " : "") + n;

			peopleMap.set(id, {
				id: id,
				name: fullName,
				gender: normalizeGender(row[genCol]),
				source: source,
				raw: row,
				parents: [],
				stepParents: [],
				spouses: [],
				manualGrandparents: { paternal: [], maternal: [] },
			});
		}
	};

	processSource(basicData, "basic");
	processSource(familyListData, "family_list");

	return peopleMap;
}

/**
 * РІВЕНЬ ДАНИХ: Наповнює існуючий словник осіб зв'язками з familyRoles.
 */
export function linkRelationships(peopleMap, rolesData) {
	if (!Array.isArray(rolesData)) return;

	const R = COLUMNS.familyRoles || {};

	const extractIds = (val) => {
		if (val === undefined || val === null || val === "") return [];
		const strVal = String(val).trim();
		if (strVal.toLowerCase() === "n") return [];

		const parts = strVal.split(SPLIT_IDS_REGEX);
		const result = [];
		for (let i = 0; i < parts.length; i++) {
			const s = parts[i].trim();
			if (s) result.push(s);
		}
		return result;
	};

	for (let i = 0; i < rolesData.length; i++) {
		const row = rolesData[i];
		const rawId =
			row[R.personId] !== undefined ? row[R.personId] : row.person_id;
		const id = String(rawId || "").trim();
		const person = peopleMap.get(id);

		if (person) {
			const bio = extractIds(
				row[R.parentsBio] !== undefined ? row[R.parentsBio] : row.parents_bio,
			);
			const adopted = extractIds(
				row[R.parentsAdopted] !== undefined
					? row[R.parentsAdopted]
					: row.parents_adopted,
			);

			// Оптимізація GC: пряма мутація замість генерування нового масиву через .concat()
			person.parents = bio;
			for (let j = 0; j < adopted.length; j++) {
				person.parents.push(adopted[j]);
			}

			person.stepParents = extractIds(
				row[R.parentsStep] !== undefined
					? row[R.parentsStep]
					: row.parents_step,
			);
			person.spouses = extractIds(
				row[R.spouses] !== undefined ? row[R.spouses] : row.spouses,
			);

			person.manualGrandparents.paternal = extractIds(
				row[R.grandparentsF] !== undefined
					? row[R.grandparentsF]
					: row.grandparents_f,
			);
			person.manualGrandparents.maternal = extractIds(
				row[R.grandparentsM] !== undefined
					? row[R.grandparentsM]
					: row.grandparents_m,
			);
		}
	}
}

/**
 * РІВЕНЬ ДАНИХ: Створює індекс (Map), де ключ — ID батька/матері, а значення — масив ID дітей.
 */
export function buildChildrenIndex(peopleMap) {
	const index = new Map();

	const iterator = peopleMap.values();
	let step = iterator.next();

	while (!step.done) {
		const child = step.value;
		if (Array.isArray(child.parents)) {
			for (let i = 0; i < child.parents.length; i++) {
				const parentId = child.parents[i];
				if (!index.has(parentId)) {
					index.set(parentId, []);
				}
				index.get(parentId).push(child.id);
			}
		}
		step = iterator.next();
	}

	return index;
}

/**
 * РІВЕНЬ ДАНИХ: Створює словник подій.
 */
export function buildEventsIndex(eventsData) {
	if (!Array.isArray(eventsData) || eventsData.length === 0) return {};

	try {
		return createLookupIndex(
			eventsData,
			COLUMNS.events?.eventId || "event_id",
			COLUMNS.events?.eventType || "event_type",
		);
	} catch (e) {
		console.warn("Помилка при створенні індексу подій:", e);
		return {};
	}
}

/**
 * Мікро-компілятор "людського" синтаксису без алокації проміжних структур.
 */
export function parseHumanFormat(val, type = "simple") {
	if (!val) return null;
	if (typeof val === "object") return val;

	const str = String(val).trim();

	if (str.startsWith("[") || str.startsWith("{")) {
		try {
			return JSON.parse(str);
		} catch (e) {
			console.warn(
				"JSON парсинг відхилено, застосовано текстовий фолбек:",
				str,
			);
		}
	}

	const rawParts = str.split("|");
	const parts = [];
	for (let i = 0; i < rawParts.length; i++) {
		const s = rawParts[i].trim();
		if (s) parts.push(s);
	}

	if (type === "simple") {
		return parts.length === 1 && !str.includes("|") ? str : parts;
	}

	const result = new Array(parts.length);

	for (let i = 0; i < parts.length; i++) {
		const p = parts[i];
		let k1 = p,
			k2 = "",
			k3 = "";

		if (type === "citizenship") {
			const colon1 = p.indexOf(":");
			if (colon1 !== -1) {
				k1 = p.substring(0, colon1).trim();
				const remainder = p.substring(colon1 + 1);
				const colon2 = remainder.indexOf(":");

				if (colon2 !== -1) {
					k2 = remainder.substring(0, colon2).trim();
					k3 = remainder.substring(colon2 + 1).trim();
				} else {
					k2 = remainder.trim();
				}
			}
			result[i] = { country: k1, period: k2, icon: k3 };
		} else {
			const colonIndex = p.indexOf(":");
			if (colonIndex !== -1) {
				k1 = p.substring(0, colonIndex).trim();
				k2 = p.substring(colonIndex + 1).trim();
			}

			if (type === "nationality") result[i] = { nation: k1, part: k2 };
			else if (type === "languages") result[i] = { lang: k1, level: k2 };
			else if (type === "appearance") result[i] = { char: k1, value: k2 };
			else if (type === "pets") result[i] = { nick: k1, period: k2 };
		}
	}

	return result;
}

/**
 * ГЛОБАЛЬНА ГІДРАТАЦІЯ ТАБЛИЦІ АРХІВІВ (Forward Fill)
 */
export function hydrateRecordsTable(records) {
	if (!Array.isArray(records)) return [];
	if (records._isHydrated) return records;

	const hydrated = new Array(records.length);
	let referenceRow = null;
	const idColPrimary = COLUMNS.records?.id || "record_id";

	for (let i = 0; i < records.length; i++) {
		const currentRow = { ...records[i] };
		const currentId =
			currentRow[idColPrimary] || currentRow.record_id || currentRow.id;

		if (currentId) {
			const refId = referenceRow
				? referenceRow[idColPrimary] ||
					referenceRow.record_id ||
					referenceRow.id
				: null;

			if (refId === currentId) {
				for (const key in referenceRow) {
					if (EXCLUDED_HYDRATION_FIELDS.has(key)) continue;

					const val = currentRow[key];
					// Усунено тотальне приведення типів String(val).trim(), яке перевантажувало GC
					if (
						val === undefined ||
						val === null ||
						val === "" ||
						(typeof val === "string" && val.trim() === "")
					) {
						currentRow[key] = referenceRow[key];
					}
				}
			}
			referenceRow = currentRow;
		} else {
			referenceRow = null;
		}

		hydrated[i] = currentRow;
	}

	hydrated._isHydrated = true;
	return hydrated;
}
