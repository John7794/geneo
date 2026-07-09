// ./scripts/components/ui/profile/birth.js

import { COLUMNS } from "../../../core/dbSchema.js";
import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";

// Утиліти математичного ядра
import {
	calculateCurrentAge,
	getPluralYears,
} from "../../../utils/dateUtils.js";
import { resolvePlaceDetails } from "../../../utils/geoUtils.js";

// UI Форматери
import { formatEventDateHtml } from "../formatters/date.js";
import { formatPlaceHtml, formatLocationHtml } from "../formatters/geo.js";

// Shared UI компоненти
import { makeRow } from "../shared/rows.js";

// Загальні хелпери
import { hasRealData, escapeHtml } from "../../../utils/helpers.js";

/**
 * РІВЕНЬ UI: Рендеринг блоку народження
 * Оптимізовано: жорстка прив'язка обчислення віку до колонки vital_status.
 */
export function renderBirthBlock(person) {
	if (!person._birth || person._birth.length === 0) return "";

	const ctx = person._context;
	const totalRecords = person._birth.length;

	// Жорстке зчитування статусу (1 - живий, все інше - неживий)
	const isAlive =
		person.vitalStatus === 1 || String(person.vitalStatus).trim() === "1";

	const unknownLabelRaw = i18n.t("common.unknown") || "Невідомо";
	const unknownLabel = escapeHtml(unknownLabelRaw);

	const recordsHTML = person._birth
		.map((record, index) => {
			const year = record[COLUMNS.birth.year];
			const month = record[COLUMNS.birth.month];
			const day = record[COLUMNS.birth.day];
			const timeVal = record[COLUMNS.birth.time];
			const placeId = record[COLUMNS.birth.placeId];
			const details = record[COLUMNS.birth.details];
			const address = record[COLUMNS.birth.address];
			const type = record[COLUMNS.birth.type];
			const adminDivision = record[COLUMNS.birth.adminDivision];
			const isOldStyle = ["1", "true", "+"].includes(
				String(record[COLUMNS.birth.calendar] || "").trim(),
			);

			// --- 1. Дата та час ---
			const dateOnly = formatEventDateHtml(day, month, year, isOldStyle);

			let fullDateHTML = dateOnly;
			if (timeVal) {
				const atLabel = escapeHtml(i18n.t("common.atTime") || "о");
				const safeTime = escapeHtml(String(timeVal));
				const metaClass = UI_CLASSES.dataRowMeta;

				fullDateHTML +=
					(fullDateHTML ? " " : "") +
					`<span class="${metaClass}">${atLabel} ${safeTime}</span>`;
			}

			// --- 2. Місце (Географія) та Прапори ---
			let exactDate = year ? String(year).trim() : "";
			if (exactDate && month) {
				exactDate += `-${String(month).padStart(2, "0")}`;
				if (day) {
					exactDate += `-${String(day).padStart(2, "0")}`;
				}
			}

			const geo = resolvePlaceDetails(placeId, year, month, day, ctx);
			const placeHTML = formatPlaceHtml(geo, adminDivision, exactDate, ctx);

			// --- 3. Локація ---
			const locHTML = formatLocationHtml(details, address);

			// --- 4. Поточний вік ---
			let ageHTML = "";
			if (isAlive && index === 0) {
				const age = calculateCurrentAge(day, month, year, timeVal);
				if (age !== null) {
					const yearsLabel = escapeHtml(getPluralYears(age));
					const isApprox = !day || !month;
					ageHTML = (isApprox ? "~" : "") + escapeHtml(String(age)) + ` ${yearsLabel}`;
				}
			}

			// --- 5. Validate Content ---
			if (
				!hasRealData([fullDateHTML, placeHTML, locHTML, ageHTML], unknownLabel)
			) {
				return "";
			}

			// --- 6. Лейбли ---
			const lblDate = escapeHtml(i18n.t("common.date") || "Дата");
			const lblPlace = escapeHtml(i18n.t("common.place") || "Місце");
			const lblLoc = escapeHtml(i18n.t("common.location") || "Локація");
			const lblAge = escapeHtml(i18n.t("common.age") || "Вік");

			// --- 7. Формування HTML ---
			let blockHtml = "";

			if (type || totalRecords > 1) {
				const actualLabel = i18n.t("common.actualDate") || "Фактична дата";
				const legalLabel = i18n.t("common.legalDate") || "Юридична дата";
				const defaultLabel = index === 0 ? actualLabel : legalLabel;

				const labelText = escapeHtml(type || defaultLabel);
				const dividerClass = UI_CLASSES.blockDivider;
				blockHtml += `<div class="${dividerClass}"><span>${labelText}</span></div>`;
			}

			if (fullDateHTML) blockHtml += makeRow(lblDate, fullDateHTML);
			if (placeHTML) blockHtml += makeRow(lblPlace, placeHTML);
			if (locHTML) blockHtml += makeRow(lblLoc, locHTML);
			if (ageHTML) blockHtml += makeRow(lblAge, ageHTML);

			return blockHtml;
		})
		.filter(Boolean)
		.join("");

	if (!recordsHTML.trim()) return "";

	const sectionTitleRaw = i18n.t("events.birth") || "Народження";
	const sectionTitle = escapeHtml(sectionTitleRaw);

	return `
    <section class="${UI_CLASSES.profileBlock}">
        <h2 class="${UI_CLASSES.profileBlockHeader}">${sectionTitle}</h2>
        <div class="${UI_CLASSES.profileBlockBody}">
            ${recordsHTML}
        </div>
    </section>
    `;
}
