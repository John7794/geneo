// ./scripts/components/ui/profile/baptism.js

import { COLUMNS } from "../../../core/dbSchema.js";
import { EVENT_ROLES } from "../../../core/appConfig.js";
import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";

import { resolvePlaceDetails } from "../../../utils/geoUtils.js";
import { resolveChurchDetails } from "../../../utils/churchUtils.js";

import { formatEventDateHtml } from "../formatters/date.js";
import { formatPlaceHtml } from "../formatters/geo.js";
import { formatChurchHtml } from "../formatters/church.js";

import { makeRow } from "../shared/rows.js";
import { renderParticipantTiles } from "../shared/participants.js";

import { hasRealData, escapeHtml } from "../../../utils/helpers.js";

/**
 * РІВЕНЬ UI: Головна функція рендеру блоку Хрещення
 * Оптимізовано: санітизація, резервні класи, примусова агрегація ролей.
 */
export function renderBaptismBlock(person) {
	if (!person._baptism || person._baptism.length === 0) return "";

	const ctx = person._context;
	const totalRecords = person._baptism.length;

	const unknownLabelRaw = i18n.t("common.unknown") || "Невідомо";
	const unknownLabel = escapeHtml(unknownLabelRaw);

	const recordsHTML = person._baptism
		.map((bap, index) => {
			// --- 1. Data Parsing ---
			const year = bap[COLUMNS.baptism?.year || "c_year"];
			const month = bap[COLUMNS.baptism?.month || "c_month"];
			const day = bap[COLUMNS.baptism?.day || "c_day"];
			const adminDivision =
				bap[COLUMNS.baptism?.adminDivision || "c_admin_division"];
			const isOldStyle = ["1", "true", "+"].includes(
				String(bap[COLUMNS.baptism?.calendar || "is_old_style"] || "").trim(),
			);

			// --- 2. Date ---
			const dateStr = formatEventDateHtml(day, month, year, isOldStyle);

			// --- 3. Place (Geo) ---
			const geo = resolvePlaceDetails(
				bap[COLUMNS.baptism?.placeId || "place_id"],
				year,
				month,
				day,
				ctx,
			);
			const placeVal = formatPlaceHtml(geo, adminDivision, year, ctx);

			// --- 4. Church ---
			const churchData = resolveChurchDetails(
				bap[COLUMNS.baptism?.churchId || "church_id"],
				year,
				ctx,
			);
			const churchVal = formatChurchHtml(churchData);

			// --- 5. Participants ---
			const participants = bap._participants || [];

			// 🔥 ПРИМУСОВА АГРЕГАЦІЯ РОЛЕЙ: Священник
			const priestRoles = EVENT_ROLES?.priests
				? [...EVENT_ROLES.priests, "priest", "pri"]
				: ["priest", "pri"];

			const priestHTML = renderParticipantTiles(participants, priestRoles, ctx);

			// 🔥 ПРИМУСОВА АГРЕГАЦІЯ РОЛЕЙ: Хрещені батьки
			const godparentRoles = EVENT_ROLES?.godparents
				? [
						...EVENT_ROLES.godparents,
						"god_p",
						"god_m",
						"godfather",
						"godmother",
					]
				: ["god_p", "god_m", "godfather", "godmother"];

			const godparentsHTML = renderParticipantTiles(
				participants,
				godparentRoles,
				ctx,
			);

			// --- 6. Validate Content ---
			if (
				!hasRealData(
					[dateStr, placeVal, churchVal, priestHTML, godparentsHTML],
					unknownLabel,
				)
			) {
				return "";
			}

			// --- 7. Divider ---
			let dividerHTML = "";
			if (totalRecords > 1) {
				const ordinals = i18n.t("time.ordinalsmd");
				const ordArray = Array.isArray(ordinals) ? ordinals : [];
				const ordinalWord = escapeHtml(ordArray[index] || `${index + 1}-е`);
				const label = escapeHtml(i18n.t("events.baptism") || "хрещення");
				const dividerClass = UI_CLASSES.blockDivider || "block-divider";
				dividerHTML = `<div class="${dividerClass}"><span>${ordinalWord} ${label}</span></div>`;
			}

			// --- 8. Assembly ---
			const lblDate = escapeHtml(i18n.t("common.date") || "Дата");
			const lblChurch = escapeHtml(i18n.t("taxonomy.church") || "Храм");
			const lblPriest = escapeHtml(i18n.t("roles.priest") || "Хрестив");
			const lblGodparents = escapeHtml(
				i18n.t("roles.godparents") || "Хресні батьки",
			);
			const lblLocation = escapeHtml(i18n.t("common.location") || "Місце");

			return `
                ${dividerHTML}
                ${makeRow(lblDate, dateStr)}
                ${makeRow(lblChurch, churchVal)}
                ${makeRow(lblPriest, priestHTML)}
                ${makeRow(lblGodparents, godparentsHTML)}
                ${makeRow(lblLocation, placeVal)}
            `;
		})
		.join("");

	if (!recordsHTML.trim()) return "";

	const sectionTitleRaw = i18n.t("events.baptism") || "Хрещення";
	const sectionTitle = escapeHtml(sectionTitleRaw);

	const blockClass = UI_CLASSES.profileBlock || "profile-block";
	const headerClass = UI_CLASSES.profileBlockHeader || "profile-block-header";
	const bodyClass = UI_CLASSES.profileBlockBody || "profile-block-body";

	return `
    <section class="${blockClass}">
        <h2 class="${headerClass}">${sectionTitle}</h2>
        <div class="${bodyClass}">
            ${recordsHTML}
        </div>
    </section>
    `;
}
