// ./scripts/components/ui/formatters/education.js

import { UI_CLASSES } from "../../../core/uiClasses.js";
import { i18n } from "../../../core/i18n.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * РІВЕНЬ UI: Формує HTML для вкладки "Освіта"
 * Оптимізовано через буферизацію рядків. Вразливості усунуто.
 * @param {Array} educationList - Масив об'єктів освіти з профілю (person._education)
 * @returns {string} HTML-розмітка
 */
export function buildEducationHtml(educationList) {
	if (
		!educationList ||
		!Array.isArray(educationList) ||
		educationList.length === 0
	) {
		return "";
	}

	// 1. Групуємо записи за рівнем освіти (level)
	const grouped = educationList.reduce((acc, item) => {
		const lvl =
			item.level && item.level.trim() !== ""
				? escapeHtml(item.level.trim())
				: escapeHtml(i18n.t("taxonomy.eduLevelDefault") || "Інша освіта");

		if (!acc[lvl]) acc[lvl] = [];
		acc[lvl].push(item);
		return acc;
	}, {});

	const htmlBuffer = [];
	htmlBuffer.push(
		`<div class="${UI_CLASSES.educationContainer || "education-container"}">`,
	);

	// 2. Рендеримо кожну групу
	for (const [level, items] of Object.entries(grouped)) {
		htmlBuffer.push(`
            <div class="${UI_CLASSES.educationGroup || "education-group"}">
                <h3 class="${UI_CLASSES.educationLevelTitle || "education-level-title"}">${level}</h3>
                <div class="${UI_CLASSES.educationList || "education-grid"}">
        `);

		// 3. Рендеримо картки навчальних закладів
		items.forEach((item) => {
			// -- Назва закладу та посилання --
			let instName = item.institution || "";
			let instHtml = "";

			if (instName) {
				instName = escapeHtml(instName)
					.replace(/\\n/g, "<br>")
					.replace(/\n/g, "<br>");
				const iconBank = UI_CLASSES.icons?.bankLine || "ri-bank-line";

				if (item.institutionLink) {
					const iconExt = "ri-arrow-right-up-line";
					const safeUrl = encodeURI(item.institutionLink);
					const externalLinkIconClass =
						UI_CLASSES.externalLinkIcon || "external-link-icon";

					instHtml = `
                        <div class="${UI_CLASSES.eduInstitution || "edu-institution"}">
                            <i class="${iconBank}"></i>
                            <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">
                                ${instName} <i class="${iconExt} ${externalLinkIconClass}"></i>
                            </a>
                        </div>`;
				} else {
					instHtml = `
                        <div class="${UI_CLASSES.eduInstitution || "edu-institution"}">
                            <i class="${iconBank}"></i>
                            <span>${instName}</span>
                        </div>`;
				}
			}

			// -- Деталі навчання --
			const detailsList = [];
			const bold = (txt) =>
				`<span class="${UI_CLASSES.eduLabel || "edu-label"}">${escapeHtml(txt)}:</span>`;

			if (item.department)
				detailsList.push(
					`<div>${bold(i18n.t("taxonomy.eduFaculty") || "Факультет")} ${escapeHtml(item.department)}</div>`,
				);
			if (item.direction)
				detailsList.push(
					`<div>${bold(i18n.t("taxonomy.eduDirection") || "Напрям")} ${escapeHtml(item.direction)}</div>`,
				);
			if (item.qualification)
				detailsList.push(
					`<div>${bold(i18n.t("taxonomy.eduQualification") || "Кваліфікація")} ${escapeHtml(item.qualification)}</div>`,
				);
			if (item.degree)
				detailsList.push(
					`<div>${bold(i18n.t("taxonomy.eduDegree") || "Ступінь")} ${escapeHtml(item.degree)}</div>`,
				);
			if (item.form)
				detailsList.push(
					`<div>${bold(i18n.t("taxonomy.eduForm") || "Форма")} ${escapeHtml(item.form)}</div>`,
				);

			const detailsHtml =
				detailsList.length > 0
					? `<div class="${UI_CLASSES.eduDetails || "edu-details"}">${detailsList.join("")}</div>`
					: "";

			// -- Мета-дані (Роки/Період та Адреса) --
			let metaHtml = "";
			const eduPeriod = item.period || item.years || "";

			if (eduPeriod || item.address) {
				const iconCal = UI_CLASSES.icons?.calendarLine || "ri-calendar-line";
				const iconPin = UI_CLASSES.icons?.mapPinLine || "ri-map-pin-line";

				const y = eduPeriod
					? `<span><i class="${iconCal}"></i> ${escapeHtml(eduPeriod)}</span>`
					: "";
				const a = item.address
					? `<span><i class="${iconPin}"></i> ${escapeHtml(item.address)}</span>`
					: "";

				metaHtml = `<div class="${UI_CLASSES.eduMeta || "edu-meta"}">
                                ${[y, a].filter(Boolean).join(`<span class="${UI_CLASSES.eduSeparator || "edu-separator"}">•</span>`)}
                            </div>`;
			}

			// -- Документ (Диплом/Атестат) --
			let docHtml = "";
			if (item.document) {
				const iconFile = UI_CLASSES.icons?.fileTextLine || "ri-article-line";
				docHtml = `<div class="${UI_CLASSES.eduDoc || "edu-document"}">
                               <i class="${iconFile}"></i> ${escapeHtml(item.document)}
                           </div>`;
			}

			// Збираємо картку
			htmlBuffer.push(`
                <div class="${UI_CLASSES.educationCard || "education-card"}">
                    ${instHtml}
                    ${metaHtml}
                    ${detailsHtml}
                    ${docHtml}
                </div>
            `);
		});

		htmlBuffer.push(`</div></div>`);
	}

	htmlBuffer.push(`</div>`);
	return htmlBuffer.join("");
}
