// ./scripts/components/ui/profile/identity.js

import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";
import { buildIdentityHtml } from "../formatters/identity.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * РІВЕНЬ UI: Головна функція рендеру блоку Ідентичність.
 * Оптимізовано: видалено фолбеки класів.
 */
export function renderIdentityBlock(person) {
	const identityData = person?._identity;

	if (!identityData) {
		return "";
	}

	const itemsHTML = buildIdentityHtml(identityData);

	if (!itemsHTML || !itemsHTML.trim()) {
		return "";
	}

	const sectionTitle = escapeHtml(
		i18n.t("profile.identity") || "Ідентичність та статус",
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
