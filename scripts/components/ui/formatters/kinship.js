// ./scripts/components/ui/formatters/kinship.js

import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * РІВЕНЬ UI: Формує HTML-бейджик зі статусом підтвердження зв'язку.
 * @param {number|string} rawStatus - Числовий код статусу (наприклад, 1, 2, 3)
 * @returns {string} HTML рядок з бейджем
 */
export function getStatusBadgeHtml(rawStatus) {
	const statusIndex = Number(rawStatus) || 0;

	const dynamicCssClass =
		UI_CLASSES.statusModifiers && UI_CLASSES.statusModifiers[statusIndex]
			? UI_CLASSES.statusModifiers[statusIndex]
			: "";

	const badgeClass = UI_CLASSES.statusBadge || "status-badge";

	if (dynamicCssClass) {
		let i18nKey = "taxonomy.statusConfirmed";
		let fallbackText = "Підтверджений зв'язок";
		if (statusIndex === 2) {
			i18nKey = "taxonomy.statusIndirect";
			fallbackText = "Опосередкований зв'язок";
		} else if (statusIndex === 3 || statusIndex === 0) {
			i18nKey = "taxonomy.statusHypothetical";
			fallbackText = "Гіпотетичний зв'язок";
		}

		const val = i18n.t(i18nKey);
		const text = escapeHtml((val && val !== i18nKey) ? val : fallbackText);

		return `<span class="${badgeClass} ${dynamicCssClass}">${text}</span>`;
	}

	// Фолбек для невідомих або відсутніх статусів
	const unknownClass = UI_CLASSES.statusUnknown || "status-unknown";
	const safeStatus = escapeHtml(String(rawStatus || 0));

	return `<span class="${badgeClass} ${unknownClass}">${safeStatus}</span>`;
}
