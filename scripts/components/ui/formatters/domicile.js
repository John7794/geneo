// ./scripts/components/ui/formatters/domicile.js

import { UI_CLASSES } from "../../../core/uiClasses.js";
import { escapeHtml, groupBy } from "../../../utils/helpers.js";
import { i18n } from "../../../core/i18n.js";

/**
 * Локальний інспектор словникових значень.
 * Здійснює пошук фізичного найменування топоніма за його логічним ідентифікатором.
 */
function resolveGeoName(identifier, ctx) {
	if (!identifier) return "";

	if (ctx && Array.isArray(ctx.places)) {
		const matchedEntity = ctx.places.find((p) => p.place_id === identifier);
		if (matchedEntity) {
			return matchedEntity.name_current || identifier;
		}
	}

	return identifier;
}

/**
 * РІВЕНЬ UI: Форматер для історії переїздів та місць проживання.
 * Генерує фрагментований вертикальний таймлайн із групуванням за типом.
 * Оптимізовано через масивну буферизацію.
 * @param {Array} domicileList - Масив об'єктів _domicile
 * @param {Object} ctx - Глобальний контекст з довідниками (словник places)
 * @returns {string} HTML-розмітка
 */
export function buildDomicileHtml(domicileList, ctx) {
	if (
		!domicileList ||
		!Array.isArray(domicileList) ||
		domicileList.length === 0
	) {
		return "";
	}

	const grouped = groupBy(domicileList, "type");
	const resultBuffer = [];

	const defaultType = i18n.t("profile.other") || "Інші";

	for (const [typeRaw, items] of Object.entries(grouped)) {
		const typeLabelRaw =
			typeRaw && typeRaw !== "undefined" ? typeRaw : defaultType;
		const typeLabel = escapeHtml(typeLabelRaw);

		const itemsBuffer = [];

		items.forEach((place) => {
			const period = escapeHtml(place.period || "");

			let settlementRaw =
				place._settlement?.name_current || place._settlement?.name;
			if (!settlementRaw) {
				settlementRaw = resolveGeoName(place.settlement, ctx);
			}

			let regionRaw = place._region?.name_current || place._region?.name;
			if (!regionRaw) {
				regionRaw = resolveGeoName(place.region, ctx);
			}

			const settlementText = escapeHtml(settlementRaw);
			const regionText = escapeHtml(regionRaw);

			// Ізоляція виключно регіонального топоніма
			const regionHtml = regionText
				? `<span class="${UI_CLASSES.dataRowMeta || "data-row__meta"} ${UI_CLASSES.placeName || "place-name"}">${regionText}</span>`
				: "";

			const geoParts = [settlementText, regionHtml]
				.filter(Boolean)
				.join("<br>");
			const address = escapeHtml(place.address || "");

			const periodHtml = period
				? `<div class="${UI_CLASSES.domicilePeriod || "domicile-period"}">${period}</div>`
				: "";

			const placeHtml = geoParts
				? `<div class="${UI_CLASSES.domicilePlace || "domicile-place"}">${geoParts}</div>`
				: "";

			const addressHtml = address
				? `<div class="${UI_CLASSES.domicileAddress || "domicile-address"}"><i class="${UI_CLASSES.icons?.mapPinLine || "ri-map-pin-line"}"></i> ${address}</div>`
				: "";

			if (!period && !geoParts && !address) return;

			itemsBuffer.push(`
                <div class="${UI_CLASSES.domicileNode || "domicile-node"}">
                    <div class="${UI_CLASSES.domicileMarker || "domicile-marker"}"></div>
                    <div class="${UI_CLASSES.domicileContent || "domicile-content"}">
                        ${periodHtml}
                        ${placeHtml}
                        ${addressHtml}
                    </div>
                </div>
            `);
		});

		if (itemsBuffer.length === 0) continue;

		resultBuffer.push(`
            <div class="${UI_CLASSES.blockDivider || "block-divider"} ${UI_CLASSES.blockDividerSubsection || "block-divider--subsection"}">
                <span>${typeLabel}</span>
            </div>
            <div class="${UI_CLASSES.domicileContainer || "domicile-container"}">
                <div class="${UI_CLASSES.domicileTimeline || "domicile-timeline"}">
                    ${itemsBuffer.join("")}
                </div>
            </div>
        `);
	}

	return resultBuffer.join("");
}
