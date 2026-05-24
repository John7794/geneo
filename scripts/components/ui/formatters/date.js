// ./scripts/components/ui/formatters/date.js

import { COLUMNS } from "../../../core/dbSchema.js";
import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";
import { escapeHtml } from "../../../utils/helpers.js";
import {
	calculateAgeAtDeath,
	getPluralYears,
	getEventDateDetails,
} from "../../../utils/dateUtils.js";

/**
 * РІВЕНЬ UI: Розраховує та форматує вік на момент смерті (повертає HTML)
 */
export function formatAgeHtml(birthData, deathRecord) {
	if (!deathRecord) return "";

	let calcAge = null;
	if (birthData) {
		const deathData = {
			year: deathRecord[COLUMNS.death.year],
			month: deathRecord[COLUMNS.death.month],
			day: deathRecord[COLUMNS.death.day],
		};
		calcAge = calculateAgeAtDeath(birthData, deathData);
	}

	if (calcAge === null) {
		const explicitAge = deathRecord[COLUMNS.death.age];
		if (explicitAge !== undefined && explicitAge !== null && String(explicitAge).trim() !== "") {
			calcAge = parseInt(explicitAge, 10);
		}
	}

	if (calcAge === null || isNaN(calcAge)) return "";

	if (calcAge === 0) {
		return escapeHtml(i18n.t("time.infant") || "менше 1 року");
	}

	return `${calcAge} ${escapeHtml(getPluralYears(calcAge))}`;
}

/**
 * РІВЕНЬ UI: Перетворює дату в рядок. Підтримує вивід подвійної дати для старого стилю (повертає HTML).
 */
export function formatEventDateHtml(d, m, y, isOldStyle = false) {
	const details = getEventDateDetails(d, m, y, isOldStyle);

	if (details.isDual) {
		const newStyleLabel = escapeHtml(
			i18n.t("time.newStyle") || "за новим стилем",
		);
		const oldStyleLabel = escapeHtml(
			i18n.t("time.oldStyle") || "за старим стилем",
		);

		const oldStyleClass =
			UI_CLASSES.eventDateOldStyle || "event-date--old-style";
		const mainClass = UI_CLASSES.dateFormatMain || "date-format-main";
		const subClass = UI_CLASSES.dateFormatSub || "date-format-sub";
		const labelClass = UI_CLASSES.dateFormatLabel || "date-format-label";

		const safeConverted = escapeHtml(details.converted);
		const safeOriginal = escapeHtml(details.original);

		return `
            <span class="${mainClass}">
                ${safeConverted} <span class="${labelClass}">${newStyleLabel}</span>
            </span>
            <div class="${subClass}">
                ${safeOriginal} <span class="${oldStyleClass} ${labelClass}">${oldStyleLabel}</span>
            </div>
        `;
	}

	return escapeHtml(details.original);
}

/**
 * РІВЕНЬ UI: Форматує короткі дати життя (повертає форматований рядок або об'єкт для рендеру).
 */
export function formatDates(bDate, dDate) {
	const bornLabel = i18n.t("events.bornShort") || "н.";
	const diedLabel = i18n.t("events.diedShort") || "п.";

	const parts = [];

	if (bDate) {
		parts.push(`${bornLabel} ${bDate}`);
	}

	if (dDate) {
		parts.push(`${diedLabel} ${dDate}`);
	}

	const lifeDatesStr = parts.join(" – ");

	return { lifeDatesStr, bDate, dDate };
}
