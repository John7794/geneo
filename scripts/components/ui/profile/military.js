// ./scripts/components/ui/profile/military.js

import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";
import { buildMilitaryHtml } from "../formatters/military.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * РІВЕНЬ UI: Головна функція рендеру блоку "Військова служба"
 * Забирає підготовлені дані з person._military і викликає форматер.
 * Оптимізовано: усунуто надлишкові фолбеки класів.
 * @param {Object} person - Об'єкт персони, згенерований processor.js
 * @returns {string} Готовий HTML-блок для вставки в профіль
 */
export function renderMilitaryBlock(person) {
	const militaryList = person?._military;

	if (!Array.isArray(militaryList) || militaryList.length === 0) {
		return "";
	}

	const itemsHTML = buildMilitaryHtml(militaryList);

	if (!itemsHTML || !itemsHTML.trim()) {
		return "";
	}

	const sectionTitle = escapeHtml(
		i18n.t("profile.military") || "Військова служба",
	);

	return `
    <section class="${UI_CLASSES.profileBlock}">
        <h2 class="${UI_CLASSES.profileBlockHeader}">${sectionTitle}</h2>
        <div class="${UI_CLASSES.profileBlockBody}">
            ${itemsHTML}
        </div>
    </section>
    `;
}
