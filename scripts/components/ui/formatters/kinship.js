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
		// Маршрутизація до нового домену таксономій
		const i18nKey =
			statusIndex === 1
				? "taxonomy.statusConfirmed"
				: "taxonomy.statusHypothetical";

		// Синхронізація фолбеків з uk.json
		const fallbackText =
			statusIndex === 1 ? "Підтверджений зв'язок" : "Гіпотетичний зв'язок";

		const text = escapeHtml(i18n.t(i18nKey) || fallbackText);

		return `<span class="${badgeClass} ${dynamicCssClass}">${text}</span>`;
	}

	// Фолбек для невідомих або відсутніх статусів
	const unknownClass = UI_CLASSES.statusUnknown || "status-unknown";
	const safeStatus = escapeHtml(String(rawStatus || 0));

	return `<span class="${badgeClass} ${unknownClass}">${safeStatus}</span>`;
}
