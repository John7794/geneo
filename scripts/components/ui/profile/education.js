// ./scripts/components/ui/profile/education.js

import { buildEducationHtml } from "../formatters/education.js";
import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * РІВЕНЬ UI: Головна функція рендеру блоку Освіта.
 * Оптимізовано: усунуто надлишкові фолбеки, додано санітизацію локалізованого заголовка.
 */
export function renderEducationBlock(person) {
	const eduList = person?._education;

	if (!Array.isArray(eduList) || eduList.length === 0) {
		return "";
	}

	const recordsHTML = buildEducationHtml(eduList);

	if (!recordsHTML || !recordsHTML.trim()) {
		return "";
	}

	const sectionTitle = escapeHtml(i18n.t("profile.education") || "Освіта");

	return `
    <section class="${UI_CLASSES.profileBlock}">
        <h2 class="${UI_CLASSES.profileBlockHeader}">${sectionTitle}</h2>
        <div class="${UI_CLASSES.profileBlockBody}">
            ${recordsHTML}
        </div>
    </section>
    `;
}
