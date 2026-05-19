// ./scripts/components/ui/formatters/geo.js

import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";
import { escapeHtml } from "../../../utils/helpers.js";
import {
	resolveFlag,
	resolveHistoricalPlaceName,
} from "../../../utils/geoUtils.js";

// ==========================================
// ХЕЛПЕРИ (Внутрішні функції для чистоти коду)
// ==========================================

/**
 * Генерує примітку статусу (зникле / у складі іншого)
 */
function buildStatusSuffix(status, statusText) {
	if (status === "pe") {
		const tooltipRaw =
			statusText ||
			i18n.t("taxonomy.churchStatusPeTooltip") ||
			"Існує в складі сусіднього населеного пункту";
		const suffixRaw =
			i18n.t("taxonomy.geoStatusPeSuffix") || "(у складі іншого)";

		return ` <span class="${UI_CLASSES.placeCurrent || "place-current"}" title="${escapeHtml(tooltipRaw)}">${escapeHtml(suffixRaw)}</span>`;
	}
	if (status === "ne") {
		const tooltipRaw =
			statusText || i18n.t("taxonomy.churchStatusNeTooltip") || "Не існує";
		const suffixRaw = i18n.t("taxonomy.geoStatusNeSuffix") || "(зникле)";

		return ` <span class="${UI_CLASSES.placeCurrent || "place-current"}" title="${escapeHtml(tooltipRaw)}">${escapeHtml(suffixRaw)}</span>`;
	}
	return "";
}

/**
 * Генерує блок з основною назвою локації та посиланням на мапу
 */
function buildMainTitleHtml(geo, dynamicHistName) {
	if (
		!geo ||
		(!geo.nameCurrent && !geo.nameHist && !geo.rawId && !dynamicHistName)
	)
		return "";

	const statusSuffix = buildStatusSuffix(geo.status, geo.statusText);

	const mainNameTextRaw =
		dynamicHistName || geo.nameHist || geo.nameCurrent || geo.rawId;
	const mainNameText = escapeHtml(mainNameTextRaw);

	let currentNameSuffix = "";

	if (
		mainNameTextRaw &&
		geo.nameCurrent &&
		mainNameTextRaw.trim() !== geo.nameCurrent.trim()
	) {
		const modPrefix = escapeHtml(i18n.t("taxonomy.geoModernPrefix") || "суч.");
		const safeCurrentName = escapeHtml(geo.nameCurrent);
		currentNameSuffix = ` <span class="${UI_CLASSES.placeCurrent || "place-current"}">(${modPrefix} ${safeCurrentName})</span>`;
	}

	let titleContent = "";

	if (geo.mapUrl) {
		const mapTooltip = escapeHtml(
			i18n.t("taxonomy.geoShowOnMap") || "Показати на мапі",
		);
		const safeUrl = encodeURI(geo.mapUrl); // Виправлено на encodeURI

		titleContent = `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="${UI_CLASSES.linkText || "link-text"}" title="${mapTooltip}">${mainNameText}</a>${currentNameSuffix}${statusSuffix}`;
	} else {
		titleContent = `${mainNameText}${currentNameSuffix}${statusSuffix}`;
	}

	return `<div class="${UI_CLASSES.placeMainTitle || "place-main-title"}">${titleContent}</div>`;
}

/**
 * Генерує ієрархію адміністративного поділу (з підтримкою історичних прапорів)
 */
function buildHierarchyHtml(divisionText, safeDate, ctx) {
	if (!divisionText || !divisionText.trim()) return "";

	const hierarchyItems = divisionText
		.split(/[/,]/)
		.map((part) => part.trim())
		.filter(Boolean)
		.map((part) => {
			const safePart = escapeHtml(part);
			let flagHtml = "";

			if (safeDate && ctx) {
				const flagUrlRaw = resolveFlag(part, safeDate, ctx);
				if (flagUrlRaw) {
					const flagUrl = encodeURI(flagUrlRaw); // Виправлено на encodeURI
					const flagPrefix = escapeHtml(
						i18n.t("taxonomy.geoFlagPrefix") || "Прапор",
					);

					flagHtml = `<img src="${flagUrl}" 
                                     class="${UI_CLASSES.flagIcon || "flag-icon"} js-gallery-item" 
                                     data-full="${flagUrl}" 
                                     data-caption="${flagPrefix}: ${safePart}" 
                                     data-group="flags"
                                     alt="${flagPrefix} ${safePart}" 
                                     title="${safePart}" 
                                     role="button" 
                                     tabindex="0">`;
				}
			}

			return `
            <div class="${UI_CLASSES.placeUnitRow || "place-unit-row"}">
                ${flagHtml}<span class="${UI_CLASSES.dataRowMeta || "data-row__meta"} ${UI_CLASSES.placeName || "place-name"}">${safePart}</span>
            </div>`;
		})
		.join("");

	return `<div class="${UI_CLASSES.placeHierarchy || "place-hierarchy"}">${hierarchyItems}</div>`;
}

// ==========================================
// ГОЛОВНІ ЕКСПОРТНІ ФУНКЦІЇ (API Модуля)
// ==========================================

export function formatPlaceHtml(
	geo,
	adminDivision = "",
	eventYear = null,
	ctx = null,
) {
	if (!geo && !adminDivision) return "";

	// 🔥 УНІВЕРСАЛЬНА НОРМАЛІЗАЦІЯ ДАТИ 🔥
	let safeDate = null;
	if (eventYear && String(eventYear).trim() !== "0") {
		let strDate = String(eventYear).trim();

		if (/^\d{4}$/.test(strDate)) {
			safeDate = `${strDate}-01-01`;
		} else {
			safeDate = strDate;
		}
	}

	let dynamicHistName = null;
	if (geo && geo.id && safeDate && ctx) {
		dynamicHistName = resolveHistoricalPlaceName(geo.id, safeDate, ctx);
	}

	const mainTitleHtml = buildMainTitleHtml(geo, dynamicHistName);
	const divisionText = adminDivision || (geo && geo.adminDivision) || "";
	const hierarchyHtml = buildHierarchyHtml(divisionText, safeDate, ctx);

	if (!mainTitleHtml && !hierarchyHtml) return "";

	return `<div class="${UI_CLASSES.geoContainer || "geo-container"}">
        ${mainTitleHtml}
        ${hierarchyHtml}
    </div>`;
}

export function formatLocationHtml(details, address) {
	const safeDetails = escapeHtml(details || "");
	const safeAddress = escapeHtml(address || "");

	if (!safeDetails && !safeAddress) return "";

	const htmlBuffer = [];
	htmlBuffer.push(
		`<div class="${UI_CLASSES.locationContainer || "location-container"}">`,
	);

	if (safeDetails) {
		htmlBuffer.push(`<span>${safeDetails}</span>`);
		if (safeAddress) {
			htmlBuffer.push(
				`<span class="${UI_CLASSES.dataRowMeta || "data-row__meta"} ${UI_CLASSES.locationAddress || "location-address"} ${UI_CLASSES.locationAddressSpaced || "location-address--spaced"}">${safeAddress}</span>`,
			);
		}
	} else if (safeAddress) {
		htmlBuffer.push(
			`<span class="${UI_CLASSES.locationAddress || "location-address"}">${safeAddress}</span>`,
		);
	}

	htmlBuffer.push("</div>");
	return htmlBuffer.join("");
}
