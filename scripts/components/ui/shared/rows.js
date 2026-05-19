// ./scripts/components/ui/shared/rows.js

import { UI_CLASSES } from "../../../core/uiClasses.js";

/**
 * РІВЕНЬ UI: Генерує стандартний рядок даних "Ключ: Значення" (Molecule: Data Row).
 * Оптимізовано: додано параметр extraValueClass для забезпечення гнучкості макета
 * (сумісність із багаторядковими значеннями у marriage.js).
 * @param {string} label - Назва поля (наприклад, "Дата", "Місце")
 * @param {string|number} value - Значення (HTML або текст).
 * @param {string} extraValueClass - Додаткові CSS класи для контейнера значення.
 * @returns {string} HTML розмітка рядка
 */
export const makeRow = (label, value, extraValueClass = "") => {
	if (value == null) return "";

	const strValue = String(value).trim();

	// РОЗУМНА ПЕРЕВІРКА НА ПУСТОТУ:
	// Вирізаємо HTML та спец-пробіли для перевірки наявності реального контенту
	const textOnly = strValue
		.replace(/<[^>]*>?/gm, "")
		.replace(/&nbsp;/g, "")
		.trim();

	if (!textOnly || textOnly === "-") return "";

	const valueClasses = extraValueClass
		? `${UI_CLASSES.dataRowValue} ${extraValueClass}`.trim()
		: UI_CLASSES.dataRowValue;

	return `
    <div class="${UI_CLASSES.dataRow}">
        <div class="${UI_CLASSES.dataRowKey}">${label}</div>
        <div class="${valueClasses}">${value}</div>
    </div>`;
};
