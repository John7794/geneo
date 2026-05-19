// ./scripts/components/ui/profile/awards.js

import { buildAwardsHtml } from "../formatters/awards.js";
import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * РІВЕНЬ UI: Головна функція рендеру блоку "Нагороди та відзнаки"
 * Оптимізовано: санітизація заголовка.
 */
export function renderAwardsBlock(person) {
	if (
		!person ||
		!person._awards ||
		!Array.isArray(person._awards) ||
		person._awards.length === 0
	) {
		return "";
	}

	const recordsHTML = buildAwardsHtml(person._awards);

	if (!recordsHTML || !recordsHTML.trim()) {
		return "";
	}

	const sectionTitleRaw = i18n.t("profile.awards") || "Нагороди та відзнаки";
	const sectionTitle = escapeHtml(sectionTitleRaw);

	return `
    <section class="${UI_CLASSES.profileBlock || "profile-block"}">
        <h2 class="${UI_CLASSES.profileBlockHeader || "profile-block-header"}">${sectionTitle}</h2>
        <div class="${UI_CLASSES.profileBlockBody || "profile-block-body"}">
            ${recordsHTML}
        </div>
    </section>
    `;
}
