// ./scripts/components/ui/profile/personal.js

import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";
import { buildPersonalHtml } from "../formatters/personal.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * РІВЕНЬ UI: Головна функція рендеру блоку "Особистий портрет"
 * Оптимізовано: видалено надлишкові перевірки об'єкта та фолбеки класів.
 */
export function renderPersonalBlock(person) {
	const personalData = person?._personal;

	if (!personalData) {
		return "";
	}

	const itemsHTML = buildPersonalHtml(personalData);

	if (!itemsHTML || !itemsHTML.trim()) {
		return "";
	}

	const sectionTitle = escapeHtml(
		i18n.t("profile.personal") || "Особистий портрет",
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
