// ./scripts/components/ui/formatters/cemetery.js

import { UI_CLASSES } from "../../../core/uiClasses.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * РІВЕНЬ UI: Форматує об'єкт даних цвинтаря та локацію могили в HTML.
 * Приймає об'єкт `cemeteryData` та рядок `graveLocation`.
 * @param {Object|null} cemeteryData - Дані про цвинтар (назва, url, адреса)
 * @param {string|null} graveLocation - Деталі розташування могили (напр., "Сектор 4, ряд 2")
 * @returns {string} HTML рядок
 */
export function formatCemeteryHtml(cemeteryData, graveLocation) {
	if (!cemeteryData && !graveLocation) return "";

	const htmlBuffer = [];

	// 1. Рендер базової інформації про цвинтар
	if (cemeteryData) {
		const nameText = escapeHtml(cemeteryData.name || "");

		if (cemeteryData.url) {
			const safeUrl = encodeURI(cemeteryData.url);
			const linkClass = UI_CLASSES.link || "link";
			htmlBuffer.push(
				`<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="${linkClass}">${nameText}</a>`,
			);
		} else if (nameText) {
			htmlBuffer.push(`<span>${nameText}</span>`);
		}

		if (cemeteryData.address) {
			htmlBuffer.push(`<div>${escapeHtml(cemeteryData.address)}</div>`);
		}
	}

	// 2. Рендер конкретного місця (сектор, ряд тощо)
	if (graveLocation) {
		const cleanLocation = String(graveLocation).trim();
		if (cleanLocation) {
			const safeLocation = escapeHtml(cleanLocation);
			// Якщо цвинтар вже відрендерено, робимо локацію як підпис (meta)
			const metaClass = UI_CLASSES.dataRowMeta || "data-row-meta";
			const wrapperClass = htmlBuffer.length > 0 ? `class="${metaClass}"` : "";
			htmlBuffer.push(`<div ${wrapperClass}>${safeLocation}</div>`);
		}
	}

	return htmlBuffer.join("");
}
