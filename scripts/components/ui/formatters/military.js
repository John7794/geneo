// ./scripts/components/ui/formatters/military.js

import { UI_CLASSES } from "../../../core/uiClasses.js";
import { i18n } from "../../../core/i18n.js";
import { escapeHtml } from "../../../utils/helpers.js";
import { makeRow } from "../shared/rows.js";

/**
 * РІВЕНЬ UI: Головна функція форматування військової служби
 * Увага: Скани та транскрипції делеговано модулю records.js
 * Оптимізовано через буферизацію масивів.
 */
export function buildMilitaryHtml(militaryList) {
	if (
		!militaryList ||
		!Array.isArray(militaryList) ||
		militaryList.length === 0
	) {
		return "";
	}

	const htmlBuffer = [];

	militaryList.forEach((item, index) => {
		if (index > 0) {
			const recordLabel = escapeHtml(i18n.t("common.record") || "Запис");
			htmlBuffer.push(
				`<div class="${UI_CLASSES.blockDivider || "block-divider"}"><span>${recordLabel} №${index + 1}</span></div>`,
			);
		}

		if (item.rank) {
			const rankLabel = escapeHtml(i18n.t("military.rank") || "Звання");
			htmlBuffer.push(makeRow(rankLabel, escapeHtml(item.rank)));
		}

		const branchRaw = item.branch || item.type;
		if (branchRaw) {
			const branchLabel = escapeHtml(i18n.t("military.branch") || "Рід військ");
			htmlBuffer.push(makeRow(branchLabel, escapeHtml(branchRaw)));
		}

		if (item.period) {
			const periodLabel = escapeHtml(i18n.t("common.period") || "Період");
			htmlBuffer.push(makeRow(periodLabel, escapeHtml(item.period)));
		}

		if (item.affiliation) {
			const affLabel = escapeHtml(
				i18n.t("military.affiliation") || "Приналежність",
			);
			htmlBuffer.push(makeRow(affLabel, escapeHtml(item.affiliation)));
		}

		if (item.position) {
			const posLabel = escapeHtml(i18n.t("military.position") || "Посада");
			htmlBuffer.push(makeRow(posLabel, escapeHtml(item.position)));
		}

		if (item.place) {
			const placeLabel = escapeHtml(
				i18n.t("common.place") || "Місце / Підрозділ",
			);
			htmlBuffer.push(makeRow(placeLabel, escapeHtml(item.place)));
		}

		if (item.participation) {
			const partLabel = escapeHtml(
				i18n.t("military.participation") || "Участь",
			);
			htmlBuffer.push(makeRow(partLabel, escapeHtml(item.participation)));
		}
	});

	return htmlBuffer.join("");
}
