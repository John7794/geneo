// ./scripts/utils/recordUtils.js

import { COLUMNS } from "../core/dbSchema.js";

// Локальний лічильник для надшвидкої генерації унікальних ID
let _fallbackIdCounter = 0;

// Винесено на рівень модуля для уникнення реініціалізації (O(1) Memory Allocation)
const EXCLUDED_FIELDS = new Set([
	COLUMNS.records?.images || "images",
	COLUMNS.records?.transcription || "transcription",
	"_images",
	"_groupId",
]);

/**
 * Нормалізує багатосторінкові архівні записи.
 * Якщо записи мають однаковий id, їхні дані зливаються, а зображення склеюються.
 * @param {Array} rawRecords - Сирий масив записів з бази даних.
 * @returns {Array} - Масив унікальних записів зі склеєними сторінками.
 */
export function mergeMultipageRecords(rawRecords) {
	if (!Array.isArray(rawRecords) || rawRecords.length === 0) return [];

	const idKey = COLUMNS.records?.id || "record_id";
	const imagesKey = COLUMNS.records?.images || "images";

	const latestStateById = new Map();
	const processedRecords = [];

	for (let i = 0; i < rawRecords.length; i++) {
		const record = rawRecords[i];

		let recId = record[idKey] || record.id;
		if (!recId) {
			recId = `gen_${++_fallbackIdCounter}`;
		} else {
			recId = String(recId).trim();
		}

		if (!latestStateById.has(recId)) {
			const merged = { ...record, _groupId: recId };
			latestStateById.set(recId, merged);
			processedRecords.push(merged);
		} else {
			const existing = latestStateById.get(recId);

			// Пряма ітерація по ключах без створення проміжних масивів
			for (const key in record) {
				if (EXCLUDED_FIELDS.has(key)) continue;

				const existingVal = existing[key];

				// Усунуто тотальне приведення типів, яке перевантажувало GC
				if (
					existingVal === undefined ||
					existingVal === null ||
					existingVal === "" ||
					(typeof existingVal === "string" && existingVal.trim() === "")
				) {
					existing[key] = record[key];
				}
			}

			// Оптимізоване склеювання зображень без надлишкових рядкових операцій
			const newImages = record[imagesKey];
			if (
				newImages &&
				(typeof newImages !== "string" || newImages.trim() !== "")
			) {
				const currentImages = existing[imagesKey] || "";
				existing[imagesKey] = currentImages
					? `${currentImages};${newImages}`
					: newImages;
			}
		}
	}

	return processedRecords;
}
