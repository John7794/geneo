// ./scripts/components/ui/profile/funeral.js

import { COLUMNS } from "../../../core/dbSchema.js";
import { EVENT_ROLES } from "../../../core/appConfig.js";
import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";

// Утиліти математичного ядра
import {
	resolvePlaceDetails,
	resolveCemeteryDetails,
} from "../../../utils/geoUtils.js";

// UI Форматери (рівень відображення)
import { formatEventDateHtml } from "../formatters/date.js";
import { formatPlaceHtml } from "../formatters/geo.js";

// Shared UI компоненти
import { makeRow } from "../shared/rows.js";
import { renderParticipantTiles } from "../shared/participants.js";

// Загальні хелпери
import { hasRealData, escapeHtml } from "../../../utils/helpers.js";

/**
 * РІВЕНЬ UI: Головна функція рендеру блоку Поховання
 * Оптимізовано: санітизація текстових вузлів, захист типів.
 */
export function renderFuneralBlock(person) {
	const funeral = person._funeral;
	if (!Array.isArray(funeral) || funeral.length === 0) return "";

	const ctx = person._context;
	const unknownLabelRaw = i18n.t("common.unknown") || "Невідомо";
	const unknownLabel = escapeHtml(unknownLabelRaw);

	// 🔥 ГЛИБОКА ЕКСТРАКЦІЯ ДАТИ СМЕРТІ 🔥
	let deathYearFallback = "";
	let deathMonthFallback = "";
	let deathDayFallback = "";
	let deathFullDateFallback = "";

	if (Array.isArray(person._death) && person._death.length > 0) {
		const deathRecord = person._death[0];
		deathYearFallback = String(deathRecord[COLUMNS.death?.year] || "").trim();
		deathMonthFallback = String(deathRecord[COLUMNS.death?.month] || "").trim();
		deathDayFallback = String(deathRecord[COLUMNS.death?.day] || "").trim();

		if (deathYearFallback && deathYearFallback !== "0") {
			const m = deathMonthFallback ? deathMonthFallback.padStart(2, "0") : "01";
			const d = deathDayFallback ? deathDayFallback.padStart(2, "0") : "01";
			deathFullDateFallback = `${deathYearFallback}-${m}-${d}`;
		}
	}

	if (!deathFullDateFallback && person.deathDate) {
		const rawDeath = String(person.deathDate).trim();
		const match = rawDeath.match(/(\d{4})/);
		if (match) {
			deathYearFallback = match[1];
			deathFullDateFallback = rawDeath;
		}
	}

	const itemsHTML = funeral
		.map((fun, index) => {
			const yRaw = String(fun[COLUMNS.funeral.year] || "").trim();
			const mRaw = String(fun[COLUMNS.funeral.month] || "").trim();
			const dRaw = String(fun[COLUMNS.funeral.day] || "").trim();

			const adminDivision = String(
				fun[COLUMNS.funeral.adminDivision] || "",
			).trim();

			const calendarVal = String(fun[COLUMNS.funeral.calendar] || "")
				.trim()
				.toLowerCase();
			const isOldStyle = ["1", "true", "+"].includes(calendarVal);

			const dateStr = formatEventDateHtml(dRaw, mRaw, yRaw, isOldStyle);

			let exactDate = "";
			let geoYear = "";
			let geoMonth = "";
			let geoDay = "";

			if (yRaw && yRaw !== "0") {
				const m = mRaw ? mRaw.padStart(2, "0") : "01";
				const d = dRaw ? dRaw.padStart(2, "0") : "01";
				exactDate = `${yRaw}-${m}-${d}`;
				geoYear = yRaw;
				geoMonth = mRaw;
				geoDay = dRaw;
			} else if (deathFullDateFallback) {
				exactDate = deathFullDateFallback;
				geoYear = deathYearFallback;
				geoMonth = deathMonthFallback;
				geoDay = deathDayFallback;
			}

			const geo = resolvePlaceDetails(
				fun[COLUMNS.funeral.placeId],
				geoYear,
				geoMonth,
				geoDay,
				ctx,
			);

			const placeHTML = formatPlaceHtml(geo, adminDivision, exactDate, ctx);

			const graveLocation = escapeHtml(
				String(
					fun[COLUMNS.funeral.details] || fun["grave_location"] || "",
				).trim(),
			);
			const rawCemeteryId = String(
				fun[COLUMNS.funeral.cemeteryId] || "",
			).trim();

			const cemData = rawCemeteryId
				? resolveCemeteryDetails(rawCemeteryId, ctx)
				: null;

			let cemeteryHTML = "";
			let cemName = "";
			let cemAddress = "";

			if (cemData && typeof cemData === "object") {
				cemName = escapeHtml(
					String(
						cemData[COLUMNS.cemeteries?.name] || cemData.name || "",
					).trim(),
				);
				cemAddress = escapeHtml(
					String(
						cemData[COLUMNS.cemeteries?.address] || cemData.address || "",
					).trim(),
				);
			} else if (rawCemeteryId) {
				cemName = escapeHtml(rawCemeteryId);
			}

			const metaClass = UI_CLASSES.dataRowMeta || "data-row__meta";

			if (cemName) {
				cemeteryHTML += `<div>${cemName}</div>`;
			}
			if (cemAddress) {
				cemeteryHTML += `<div class="${metaClass}">${cemAddress}</div>`;
			}
			if (graveLocation) {
				cemeteryHTML += `<div class="${metaClass}">${graveLocation}</div>`;
			}

			const participants = Array.isArray(fun._participants)
				? fun._participants
				: [];
			const priestHTML = renderParticipantTiles(
				participants,
				EVENT_ROLES.priests,
				ctx,
			);

			if (
				!hasRealData(
					[dateStr, placeHTML, cemeteryHTML, priestHTML],
					unknownLabel,
				)
			) {
				return "";
			}

			let dividerHTML = "";
			if (index > 0) {
				const recordLabel = escapeHtml(i18n.t("common.record") || "Запис");
				const dividerClass = UI_CLASSES.blockDivider || "block-divider";
				dividerHTML = `<div class="${dividerClass}"><span>${recordLabel} №${index + 1}</span></div>`;
			}

			const lblDate = escapeHtml(i18n.t("common.date") || "Дата");
			const lblBuriedBy = escapeHtml(i18n.t("roles.buriedBy") || "Поховав");
			const lblCemetery = escapeHtml(i18n.t("taxonomy.cemetery") || "Цвинтар");
			const lblPlace = escapeHtml(i18n.t("common.place") || "Місце");

			return `
                ${dividerHTML}
                ${makeRow(lblDate, dateStr)}
                ${makeRow(lblPlace, placeHTML)}
                ${makeRow(lblCemetery, cemeteryHTML)}
                ${makeRow(lblBuriedBy, priestHTML)}
            `;
		})
		.filter(Boolean)
		.join("");

	if (!itemsHTML || !itemsHTML.trim()) return "";

	const sectionTitleRaw = i18n.t("events.funeral") || "Поховання";
	const sectionTitle = escapeHtml(sectionTitleRaw);

	const blockClass = UI_CLASSES.profileBlock || "profile-block";
	const headerClass = UI_CLASSES.profileBlockHeader || "profile-block-header";
	const bodyClass = UI_CLASSES.profileBlockBody || "profile-block-body";

	return `
    <section class="${blockClass}">
        <h2 class="${headerClass}">${sectionTitle}</h2>
        <div class="${bodyClass}">
            ${itemsHTML}
        </div>
    </section>
    `;
}
