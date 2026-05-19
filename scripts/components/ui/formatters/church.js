// ./scripts/components/ui/formatters/church.js

import { UI_CLASSES } from "../../../core/uiClasses.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * РІВЕНЬ UI: Форматує об'єкт даних церкви в HTML.
 * Приймає об'єкт `churchData`, згенерований `resolveChurchDetails`.
 */
export function formatChurchHtml(churchData, options = {}) {
	if (!churchData) {
		return options.returnObject ? { churchHtml: "", religionHtml: "" } : "";
	}

	const htmlBuffer = [];

	// 1. Уніфікація жирності та санітизація назви
	const safeName = escapeHtml(churchData.name || "");
	let nameHtml = "";

	if (churchData.url) {
		const safeUrl = encodeURI(churchData.url);
		const linkClass = UI_CLASSES.internalLink || "internal-link";
		nameHtml = `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="${linkClass}">${safeName}</a>`;
	} else {
		nameHtml = safeName;
	}

	const titleClass = UI_CLASSES.placeMainTitle || "place-main-title";
	htmlBuffer.push(`<div class="${titleClass}">${nameHtml}</div>`);

	// 2. Адреса (безпечна ін'єкція)
	if (churchData.address) {
		const safeAddress = escapeHtml(churchData.address);
		const metaClass = UI_CLASSES.dataRowMeta || "data-row-meta";
		const addrClass = UI_CLASSES.locationAddress || "location-address";
		const addrSpacedClass =
			UI_CLASSES.locationAddressSpaced || "location-address--spaced";

		htmlBuffer.push(
			`<div class="${metaClass} ${addrClass} ${addrSpacedClass}">${safeAddress}</div>`,
		);
	}

	// 3. Церковні адміністративні одиниці
	if (Array.isArray(churchData.hierarchy) && churchData.hierarchy.length > 0) {
		const hierarchyItems = churchData.hierarchy
			.map((item) => {
				const safeItemName = escapeHtml(item.name || "");
				const rowClass = UI_CLASSES.placeUnitRow || "place-unit-row";
				const metaClass = UI_CLASSES.dataRowMeta || "data-row-meta";
				const nameClass = UI_CLASSES.placeName || "place-name";

				return `
            <div class="${rowClass}">
                <span class="${metaClass} ${nameClass}">${safeItemName}</span>
            </div>`;
			})
			.join("");

		const hierarchyClass = UI_CLASSES.placeHierarchy || "place-hierarchy";
		htmlBuffer.push(`<div class="${hierarchyClass}">${hierarchyItems}</div>`);
	}

	// Огортаємо все у загальний контейнер
	const containerClass = UI_CLASSES.locationContainer || "location-container";
	const churchHtml = `<div class="${containerClass}">${htmlBuffer.join("")}</div>`;

	if (options.returnObject) {
		const religionHtml = [churchData.religion, churchData.confession]
			.filter(Boolean)
			.map((str) => escapeHtml(String(str)))
			.join(" / ");

		return { churchHtml, religionHtml };
	}

	return churchHtml;
}
