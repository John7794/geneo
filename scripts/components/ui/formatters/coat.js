// ./scripts/components/ui/formatters/coat.js

import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * РІВЕНЬ UI: Генерує HTML для відображення назви та (якщо є) зображення герба.
 * @param {string} coatName - Назва герба (наприклад, "Сас")
 * @param {string|null} coatUrl - URL зображення
 * @returns {string} HTML рядок з гербом
 */
export function formatCoatHtml(coatName, coatUrl) {
	if (!coatName) return "";

	const cleanName = String(coatName).trim();
	const safeName = escapeHtml(cleanName);

	if (!coatUrl) {
		return safeName;
	}

	const coatPrefix = i18n.t("profile.coat") || "Герб";
	const fullCaption = `${escapeHtml(coatPrefix)} ${safeName}`;
	const safeUrl = encodeURI(coatUrl);

	const containerClass = UI_CLASSES.coatContainer || "coat-container";
	const iconClass = UI_CLASSES.dataRowIcon || "data-row-icon";
	const coatIconClass = UI_CLASSES.coatIcon || "coat-icon";

	// Додано data-group та примусове розблокування кліків (pointer-events)
	return `
        <span class="${containerClass}">
            ${safeName}
            <img src="${safeUrl}" 
                 alt="${fullCaption}" 
                 class="${iconClass} ${coatIconClass} js-gallery-item" 
                 title="${fullCaption}" 
                 data-full="${safeUrl}"
                 data-caption="${fullCaption}"
                 data-group="heraldry"
                 loading="lazy">
        </span>
    `;
}
