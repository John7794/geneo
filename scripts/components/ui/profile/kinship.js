// ./scripts/components/ui/profile/kinship.js

import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";
import { escapeHtml } from "../../../utils/helpers.js";

// Утиліти математичного ядра
import { getKinshipColumns } from "../../../utils/kinshipUtils.js";
import { getProfileUrl } from "../../../utils/personUtils.js";

// UI Форматери
import { getFormattedGenitiveNameHtml } from "../formatters/name.js";

/**
 * Рендерить одну картку спорідненості.
 * Оптимізовано: пряме звернення до словника класів.
 */
function renderKinshipCard(item, ctx) {
	const formattedName = getFormattedGenitiveNameHtml(item);
	const safeRole = escapeHtml(item.role || "");

	const roleHtml = `<div class="${UI_CLASSES.kinshipCardRole}">${safeRole}</div>`;
	const nameHtml = `<div class="${UI_CLASSES.kinshipCardName}">${formattedName}</div>`;

	if (item.personId) {
		// ПРИМУСОВО вказуємо, що нам потрібен саме профіль (view=profile)
		let url = getProfileUrl(item.personId, { ...ctx, view: "profile" });

		if (!url.includes("view=profile")) {
			url += url.includes("?") ? "&view=profile" : "?view=profile";
		}

		const safeUrl = encodeURI(url);
		const safeId = escapeHtml(String(item.personId));
		const titleText = escapeHtml(
			i18n.t("ui.viewProfile") || "Перейти до профілю",
		);

		return `
            <a href="${safeUrl}" data-id="${safeId}" class="${UI_CLASSES.kinshipCard} ${UI_CLASSES.kinshipCardAffinity} ${UI_CLASSES.internalLink}" title="${titleText}">
                ${roleHtml}
                ${nameHtml}
            </a>
        `;
	}

	return `
        <div class="${UI_CLASSES.kinshipCard} ${UI_CLASSES.kinshipCardAffinity}">
            ${roleHtml}
            ${nameHtml}
        </div>
    `;
}

/**
 * Рендеринг блоку спорідненості (5 фіксованих колонок).
 * Оптимізовано: усунуто фолбеки та використано опціональні ланцюжки.
 */
export function renderKinshipBlock(person) {
	if (!person?.id) return "";

	const ctx = person._context;
	const kinshipColumns = getKinshipColumns(person.id, ctx);

	// Перевірка наявності даних хоча б в одній колонці
	if (!kinshipColumns?.some((col) => col?.length > 0)) {
		return "";
	}

	const columnsHtml = kinshipColumns
		.map((colItems) => {
			if (!colItems?.length) {
				return `<div class="${UI_CLASSES.kinshipCol}"></div>`;
			}

			const cardsHtml = colItems
				.map((item) => renderKinshipCard(item, ctx))
				.join("");

			return `
                <div class="${UI_CLASSES.kinshipCol}">
                    ${cardsHtml}
                </div>
            `;
		})
		.join("");

	const headerText = escapeHtml(
		i18n.t("kinship.kinshipWithYou") || "Спорідненість з Вами",
	);

	return `
    <section class="${UI_CLASSES.profileBlock}">
        <h2 class="${UI_CLASSES.profileBlockHeader}">${headerText}</h2>
        <div class="${UI_CLASSES.profileBlockBody}">
            <div class="${UI_CLASSES.kinshipGrid} ${UI_CLASSES.kinshipGrid5Cols}">
                ${columnsHtml}
            </div>
        </div>
    </section>
    `;
}
