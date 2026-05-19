// ./scripts/components/ui/tree/mobileTreeBuilder.js

import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";
import { renderPersonTile } from "../shared/personTile.js";
import {
	clearTreeCache,
	getCachedPersonDetails,
	getMappedParents,
} from "../../../utils/treeUtils.js";

/**
 * Отримання локалізованого заголовка для конкретного рівня покоління.
 */
function getGenerationLabel(index) {
	switch (index) {
		case 1:
			return i18n.t("profile.parents") || "Батьки";
		case 2:
			return i18n.t("profile.grandparents") || "Дідусі та бабусі";
		case 3:
			return i18n.t("profile.greatgrandparents") || "Прадіди та прабабусі";
		case 4:
			return (
				i18n.t("profile.greatgreatgrandparents") || "Прапрадіди та прапрабабусі"
			);
		default: {
			const ancestors = i18n.t("profile.ancestors") || "Предки";
			return `${ancestors} ${index}-го покоління`;
		}
	}
}

/**
 * Побудова мобільного дерева. Пошук у ширину (BFS) із застосуванням PersonTile.
 * Відсікання рекурсії для невідомих гілок. Обмеження рівно у 5 поколінь.
 */
export function buildMobileGenerationHTML(
	rootId,
	context,
	maxGen = 5,
	allowedIds = null,
) {
	if (!rootId) return "";

	// Делегуємо очищення глобальній утиліті
	clearTreeCache();

	const generations = [];
	generations.push([{ id: rootId, role: "root" }]);

	for (let depth = 0; depth < maxGen - 1; depth++) {
		const currentGen = generations[depth];
		const nextGen = [];
		let hasParents = false;

		currentGen.forEach((node) => {
			if (!node.id || node.id === "unknown") return;

			const { fatherId, motherId } = getMappedParents(node.id, context);

			const validFather =
				fatherId && (!allowedIds || allowedIds.includes(String(fatherId)))
					? fatherId
					: "unknown";
			const validMother =
				motherId && (!allowedIds || allowedIds.includes(String(motherId)))
					? motherId
					: "unknown";

			if (validFather !== "unknown" || validMother !== "unknown") {
				hasParents = true;
			}

			nextGen.push({ id: validFather, role: "father" });
			nextGen.push({ id: validMother, role: "mother" });
		});

		// Інтеграція масиву невідомих вузлів перед зупинкою обходу
		if (nextGen.length > 0) {
			generations.push(nextGen);
		}

		if (!hasParents) break;
	}

	const containerClass =
		UI_CLASSES.treeMobileContainer || "tree-mobile-container";

	const htmlBuffer = [`<div class="${containerClass}">`];

	const strictOptions = {
		useCaps: false,
		uppercaseSurname: false,
		showMaidenName: false,
		disablePopup: true,
	};

	generations.forEach((gen, index) => {
		if (gen.length === 0) return;
		const levelClass = UI_CLASSES.treeMobileLevel || "tree-mobile-level";

		if (index > 0) {
			const labelText = getGenerationLabel(index);
			const dividerClass =
				UI_CLASSES.treeMobileDivider || "tree-mobile-divider";
			htmlBuffer.push(
				`<div class="${dividerClass}"><span>${labelText.toUpperCase()}</span></div>`,
			);
		}

		htmlBuffer.push(
			`<div class="${levelClass} ${index === 0 ? levelClass + "--root" : ""}">`,
		);

		gen.forEach((n) => {
			const person =
				n.id !== "unknown" ? getCachedPersonDetails(n.id, context) : null;
			const isPlaceholder = !person || person.source === "unknown";

			let renderData = person;
			if (person) {
				renderData = { ...person };
				renderData.surnameBirth = "";
				renderData.maidenName = "";
			}

			htmlBuffer.push(
				renderPersonTile(renderData, context, "", isPlaceholder, strictOptions),
			);
		});

		htmlBuffer.push(`</div>`);
	});

	htmlBuffer.push(`</div>`);
	return htmlBuffer.join("");
}
