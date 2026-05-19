// ./scripts/components/ui/profile/death.js

import { COLUMNS } from "../../../core/dbSchema.js";
import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";

// Утиліти математичного ядра
import { getBirthData } from "../../../utils/dateUtils.js";
import { resolvePlaceDetails } from "../../../utils/geoUtils.js";

// UI Форматери (рівень відображення)
import { formatAgeHtml, formatEventDateHtml } from "../formatters/date.js";
import { formatPlaceHtml, formatLocationHtml } from "../formatters/geo.js";

// Shared UI компоненти
import { makeRow } from "../shared/rows.js";

// Загальні хелпери
import { hasRealData, escapeHtml } from "../../../utils/helpers.js";

/**
 * РІВЕНЬ UI: Головна функція рендеру блоку Смерті
 * Оптимізовано: видалено діагностичне логування.
 */
export function renderDeathBlock(person) {
	const deaths = person._death;

	if (!deaths || deaths.length === 0) return "";

	const ctx = person._context;
	const birthData = getBirthData(person);
	const unknownLabelRaw = i18n.t("common.unknown") || "Невідомо";
	const unknownLabel = escapeHtml(unknownLabelRaw);

	const itemsHTML = deaths
		.map((record, index) => {
			// --- 1. Extraction ---
			const year = record[COLUMNS.death.year];
			const month = record[COLUMNS.death.month];
			const day = record[COLUMNS.death.day];
			const adminDivision = record[COLUMNS.death.adminDivision];
			const isOldStyle = ["1", "true", "+"].includes(
				String(record[COLUMNS.death.calendar] || "").trim(),
			);

			// --- 2. Date ---
			const dateStr = formatEventDateHtml(day, month, year, isOldStyle);

			// --- 3. Place (Geo) ---
			const geo = resolvePlaceDetails(
				record[COLUMNS.death.placeId],
				year,
				month,
				day,
				ctx,
			);

			let exactDate = "";
			if (year) {
				const y = String(year).trim();
				const m = month ? String(month).padStart(2, "0") : "01";
				const d = day ? String(day).padStart(2, "0") : "01";
				exactDate = `${y}-${m}-${d}`;
			}

			const placeHTML = formatPlaceHtml(geo, adminDivision, exactDate, ctx);

			// --- 4. Location ---
			const locationHTML = formatLocationHtml(
				record[COLUMNS.death.details],
				record[COLUMNS.death.address],
			);

			// --- 5. Age ---
			const ageHTML = formatAgeHtml(birthData, record);

			// --- 6. Cause ---
			const rawCause = record[COLUMNS.death.cause];
			const cause = rawCause ? escapeHtml(String(rawCause).trim()) : "";

			// --- 7. Validation ---
			const isValid = hasRealData(
				[dateStr, placeHTML, locationHTML, ageHTML, cause],
				unknownLabel,
			);

			if (!isValid) {
				return "";
			}

			// --- 8. Divider ---
			let dividerHTML = "";
			if (index > 0) {
				const recordLabel = escapeHtml(i18n.t("common.record") || "Запис");
				const dividerClass = UI_CLASSES.blockDivider || "block-divider";
				dividerHTML = `<div class="${dividerClass}"><span>${recordLabel} №${index + 1}</span></div>`;
			}

			// --- 9. Labels ---
			const lblDate = escapeHtml(i18n.t("common.date") || "Дата");
			const lblPlace = escapeHtml(i18n.t("common.place") || "Місце");
			const lblLoc = escapeHtml(i18n.t("common.location") || "Локація");
			const lblAge = escapeHtml(i18n.t("common.age") || "Вік");
			const lblCause = escapeHtml(i18n.t("common.cause") || "Причина");

			return `
                ${dividerHTML}
                ${makeRow(lblDate, dateStr)}
                ${makeRow(lblPlace, placeHTML)}
                ${makeRow(lblLoc, locationHTML)}
                ${makeRow(lblAge, ageHTML)}
                ${makeRow(lblCause, cause)}
            `;
		})
		.filter(Boolean)
		.join("");

	if (!itemsHTML || !itemsHTML.trim()) return "";

	const sectionTitleRaw = i18n.t("events.death") || "Смерть";
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
