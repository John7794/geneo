// ./scripts/components/ui/profile/domicile.js

import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";
import { buildDomicileHtml } from "../formatters/domicile.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * РІВЕНЬ UI: Контролер рендеру таймлайну проживання.
 * Оптимізовано: усунуто надлишкові фолбеки класів та скорочено перевірки.
 */
export function renderDomicileBlock(person) {
	const domicileList = person?._domicile;

	if (!Array.isArray(domicileList) || domicileList.length === 0) {
		return "";
	}

	const itemsHTML = buildDomicileHtml(domicileList, person?._context);

	if (!itemsHTML || !itemsHTML.trim()) {
		return "";
	}

	const sectionTitle = escapeHtml(
		i18n.t("profile.domicile") || "Місця проживання",
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
