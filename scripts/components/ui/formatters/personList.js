// ./scripts/components/ui/formatters/personList.js

import { i18n } from "../../../core/i18n.js";
import { getProfileUrl } from "../../../utils/personUtils.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * РІВЕНЬ UI: Генерує HTML-список родичів (з іконками та посиланнями).
 * Впроваджено екранування вузлів та резервні класи.
 * @param {Array} list - Масив об'єктів осіб
 * @param {Object} ctx - Глобальний контекст
 * @param {string} emptyMessage - Повідомлення, якщо список порожній
 */
export function renderPersonList(list, ctx, emptyMessage = "") {
	if (!list || list.length === 0) return emptyMessage;

	// Інтеграція універсального домену
	const unknownLabelRaw = i18n.t("common.unknown") || "Невідомо";
	const unknownLabel = escapeHtml(unknownLabelRaw);

	return list
		.map((p) => {
			const nameParts = [];

			if (p.surname) nameParts.push(escapeHtml(p.surname));
			if (p.maidenName) nameParts.push(`(${escapeHtml(p.maidenName)})`);
			if (p.name) nameParts.push(escapeHtml(p.name));
			if (p.patronymic) nameParts.push(escapeHtml(p.patronymic));

			const fullNameHTML = nameParts.join(" ").trim() || unknownLabel;

			const yearsClass = UI_CLASSES.years || "years";
			const years = p.lifeYears
				? ` <span class="${yearsClass}">(${escapeHtml(p.lifeYears)})</span>`
				: "";

			const iconClass = UI_CLASSES.icons?.user || "ri-user-line";
			const itemClass = UI_CLASSES.familyLinkItem || "family-link-item";

			if (p.id && p.hasProfile !== false) {
				const safeUrl = encodeURI(getProfileUrl(p.id, ctx));
				const safeId = escapeHtml(String(p.id));
				const linkClass = UI_CLASSES.internalLink || "internal-link";

				return `
                    <div class="${itemClass}">
                        <a href="${safeUrl}" data-id="${safeId}" class="${linkClass}">
                            <i class="${iconClass}" aria-hidden="true"></i> ${fullNameHTML}
                        </a>
                        ${years}
                    </div>`;
			} else {
				const unlinkedClass = UI_CLASSES.unlinkedPerson || "unlinked-person";
				const unlinkedIconClass =
					UI_CLASSES.unlinkedPersonIcon || "unlinked-person-icon";

				return `
                    <div class="${itemClass}">
                        <span class="${unlinkedClass}">
                            <i class="${iconClass} ${unlinkedIconClass}" aria-hidden="true"></i> ${fullNameHTML}
                        </span>
                        ${years}
                    </div>`;
			}
		})
		.join("");
}
