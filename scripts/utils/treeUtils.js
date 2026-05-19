// ./scripts/utils/treeUtils.js

import { COLUMNS } from "../core/dbSchema.js";
import { findPersonDetails } from "./personUtils.js";
import { getParentIds } from "./kinshipUtils.js";
import { isFemale } from "./genderUtils.js";

// Мемоїзація вузлів та дат
const personCache = new Map();
const datesCache = new Map();

// Ліниві індекси для O(1) доступу до масивів подій
let birthIndex = null;
let deathIndex = null;

/**
 * Хелпер для екстракції без алокації пам'яті (O(1) Memory Allocation).
 */
function extractBaseId(exactId) {
	const idx = exactId.lastIndexOf("::");
	return idx !== -1 ? exactId.substring(idx + 2) : exactId;
}

/**
 * Побудова хеш-таблиці для швидкого пошуку.
 * Оптимізовано під V8. Усунуто жорстке кодування.
 */
function buildIndex(array, schemaCol) {
	const map = new Map();
	if (!Array.isArray(array)) return map;

	for (let i = 0; i < array.length; i++) {
		const item = array[i];
		const rawId = item.person_id || item.id;
		if (!rawId) continue;

		const id = String(rawId).trim();
		// Пріоритет колонки зі схеми з автоматичним фолбеком
		const val =
			item[schemaCol] || item.year || item.b_year || item.d_year || "";

		if (id && val) map.set(id, val);
	}
	return map;
}

/**
 * Очищення пам'яті. Запобігає витокам пам'яті (Memory Leaks) між переходами.
 */
export function clearTreeCache() {
	personCache.clear();
	datesCache.clear();
	birthIndex = null;
	deathIndex = null;
}

/**
 * Мемоїзований пошук персони. Зберігає оригінальний запит.
 */
export function getCachedPersonDetails(id, context) {
	if (!id) return null;
	const cleanId = String(id).trim();

	if (personCache.has(cleanId)) return personCache.get(cleanId);

	const person = findPersonDetails(cleanId, context);
	personCache.set(cleanId, person);
	return person;
}

/**
 * Мемоїзований пошук дат.
 * Впроваджено захист від TypeError та синхронізацію з COLUMNS.
 */
export function getCachedDates(id, DB) {
	if (!id) return { bYear: "", dYear: "" };
	const cleanId = String(id).trim();

	if (datesCache.has(cleanId)) return datesCache.get(cleanId);

	let bYear = "";
	let dYear = "";

	// Броньована перевірка цілісності об'єкта бази даних
	if (DB) {
		if (!birthIndex) {
			const bCol = COLUMNS.birth?.year || "year";
			birthIndex = buildIndex(DB.birth, bCol);
		}
		if (!deathIndex) {
			const dCol = COLUMNS.death?.year || "year";
			deathIndex = buildIndex(DB.deaths || DB.death, dCol);
		}

		const baseId = extractBaseId(cleanId);
		bYear = birthIndex.get(cleanId) || birthIndex.get(baseId) || "";
		dYear = deathIndex.get(cleanId) || deathIndex.get(baseId) || "";
	}

	const result = { bYear, dYear };
	datesCache.set(cleanId, result);
	return result;
}

/**
 * Універсальний мапінг батьків для дерева.
 * Жорстко зберігає префікси для підтримки контексту під час рекурсії.
 */
export function getMappedParents(childId, context) {
	let fatherId = null;
	let motherId = null;

	if (!childId) return { fatherId, motherId };

	let parentIdsArray = [];
	if (typeof getParentIds === "function") {
		parentIdsArray = getParentIds(childId, context);
	} else if (context && typeof context.getParents === "function") {
		parentIdsArray = context.getParents(childId);
	}

	if (Array.isArray(parentIdsArray)) {
		for (let i = 0; i < parentIdsArray.length; i++) {
			const cleanPid = String(parentIdsArray[i]).trim();
			if (!cleanPid) continue;

			const p = getCachedPersonDetails(cleanPid, context);

			if (p && p.id && p.source !== "unknown") {
				if (isFemale(p.gender)) {
					// ЗБЕРЕЖЕННЯ КОНТЕКСТУ: Використовуємо cleanPid (з префіксом/контекстом)
					if (!motherId) motherId = cleanPid;
				} else {
					if (!fatherId) fatherId = cleanPid;
				}
			} else {
				if (!fatherId) fatherId = cleanPid;
				else if (!motherId) motherId = cleanPid;
			}
		}
	}

	return { fatherId, motherId };
}
