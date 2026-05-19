// ./scripts/components/ui/profile/gallery.js

import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";
import { buildGalleryHtml } from "../formatters/gallery.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * РІВЕНЬ UI: Контролер рендеру фотогалереї профілю.
 * Оптимізовано: усунуто надлишкові фолбеки класів, додано санітизацію заголовка.
 */
export function renderGalleryBlock(person) {
	const galleryList = person?._gallery;

	if (!Array.isArray(galleryList) || galleryList.length === 0) {
		return "";
	}

	const itemsHTML = buildGalleryHtml(galleryList);

	if (!itemsHTML || !itemsHTML.trim()) {
		return "";
	}

	const sectionTitle = escapeHtml(i18n.t("profile.gallery") || "Фотогалерея");

	return `
    <section class="${UI_CLASSES.profileBlock}">
        <h2 class="${UI_CLASSES.profileBlockHeader}">${sectionTitle}</h2>
        <div class="${UI_CLASSES.profileBlockBody}">
            ${itemsHTML}
        </div>
    </section>
    `;
}
