// ./scripts/utils/helpers.js

import { HTML_ENTITIES } from "../core/appConfig.js";

const HTML_REGEX = /[&<>"'`]/g;
const HTML_TAGS_REGEX = /<[^>]+>/g;
const DRIVE_DIR_REGEX = /\/d\/([a-zA-Z0-9_-]+)/;
const DRIVE_ID_REGEX = /id=([a-zA-Z0-9_-]+)/;
const SPLIT_DELIMITER_REGEX = /[,;|]+/;

export function freezeSet(iterable) {
	const set = new Set(iterable);
	set.add =
		set.delete =
		set.clear =
			() => {
				throw new Error(
					"Критична помилка: Спроба мутації замороженої структури Set",
				);
			};
	return set;
}

export function escapeHtml(unsafe) {
	if (unsafe == null) return "";
	return String(unsafe).replace(HTML_REGEX, (match) => HTML_ENTITIES[match]);
}

export function splitString(val, delimiter = SPLIT_DELIMITER_REGEX) {
	if (!val) return [];
	const parts = String(val).split(delimiter);
	const result = [];

	for (let i = 0; i < parts.length; i++) {
		const trimmed = parts[i].trim();
		if (trimmed) result.push(trimmed);
	}

	return result;
}

export function groupBy(array, key) {
	if (!Array.isArray(array)) return {};
	const result = {};

	for (let i = 0; i < array.length; i++) {
		const item = array[i];
		const groupKey = item[key];
		const safeKey =
			groupKey !== undefined && groupKey !== null ? groupKey : "undefined";

		result[safeKey] ??= [];
		result[safeKey].push(item);
	}

	return result;
}

export function createLookupIndex(dataset, idCol, typeCol) {
	const index = {};
	if (!Array.isArray(dataset)) return index;

	for (let i = 0; i < dataset.length; i++) {
		const item = dataset[i];
		const typeVal = item[typeCol];
		const idVal = item[idCol];

		if (
			typeVal !== undefined &&
			typeVal !== null &&
			idVal !== undefined &&
			idVal !== null
		) {
			const key = `${String(typeVal).toLowerCase()}_${idVal}`;
			index[key] ??= [];
			index[key].push(item);
		}
	}

	return index;
}

export function convertDriveLink(url) {
	if (!url) return "";
	if (!url.includes("google.com")) return url.trim();

	try {
		let id = "";
		const match1 = url.match(DRIVE_DIR_REGEX);

		if (match1) {
			id = match1[1];
		} else {
			const match2 = url.match(DRIVE_ID_REGEX);
			if (match2) id = match2[1];
		}

		if (id) {
			return `https://drive.google.com/uc?export=view&id=${id}`;
		}
	} catch (e) {
		console.warn("Помилка конвертації посилання:", url);
	}

	return url;
}

export function createValueGetter(basicRow, famRow) {
	const rawData = basicRow || famRow || {};

	return function getVal(colBasic, colFam) {
		if (
			basicRow &&
			basicRow[colBasic] !== undefined &&
			basicRow[colBasic] !== null &&
			basicRow[colBasic] !== ""
		) {
			return basicRow[colBasic];
		}
		if (
			famRow &&
			famRow[colFam] !== undefined &&
			famRow[colFam] !== null &&
			famRow[colFam] !== ""
		) {
			return famRow[colFam];
		}
		return rawData[colFam] || "";
	};
}

export function stripHtml(html) {
	if (!html) return "";
	return String(html).replace(HTML_TAGS_REGEX, "").trim();
}

export function hasRealData(values, unknownLabel = "невідомо") {
	if (!Array.isArray(values)) return false;
	const label = String(unknownLabel).toLowerCase();

	for (let i = 0; i < values.length; i++) {
		if (values[i] === undefined || values[i] === null) continue;
		const cleanVal = stripHtml(values[i]).toLowerCase();
		if (cleanVal !== "" && cleanVal !== label) return true;
	}

	return false;
}

export function normalizeDatabaseIds(db) {
	if (!db) return;

	if (Array.isArray(db.basic)) {
		for (let i = 0; i < db.basic.length; i++) {
			const row = db.basic[i];
			if (row.person_id) row.person_id = String(row.person_id).trim();
			if (row.id) row.id = String(row.id).trim();
			if (row.father_id) row.father_id = String(row.father_id).trim();
			if (row.mother_id) row.mother_id = String(row.mother_id).trim();
		}
	}

	if (Array.isArray(db.Family_Roles)) {
		for (let i = 0; i < db.Family_Roles.length; i++) {
			const row = db.Family_Roles[i];
			if (row.person_id) row.person_id = String(row.person_id).trim();

			if (row.parents_bio) {
				const parts = String(row.parents_bio).split(";");
				const buffer = [];
				for (let j = 0; j < parts.length; j++) {
					const trimmed = parts[j].trim();
					if (trimmed) {
						buffer.push(trimmed);
					}
				}
				row.parents_bio = buffer.join(";");
			}
		}
	}
}
