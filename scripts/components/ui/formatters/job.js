// ./scripts/components/ui/formatters/job.js

import { UI_CLASSES } from "../../../core/uiClasses.js";
import { i18n } from "../../../core/i18n.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * РІВЕНЬ UI: Формує HTML для вкладки "Кар'єра / Робота"
 * Оптимізовано: буферизація, санітизація, вилучення інлайн-стилів.
 * @param {Array} jobList - Масив об'єктів роботи з профілю (person._job)
 * @returns {string} HTML-розмітка
 */
export function buildJobHtml(jobList) {
	if (!jobList || !Array.isArray(jobList) || jobList.length === 0) {
		return "";
	}

	const htmlBuffer = [];
	htmlBuffer.push(
		`<div class="${UI_CLASSES.jobContainer || "job-container"}">`,
	);
	htmlBuffer.push(`<div class="${UI_CLASSES.jobList || "job-grid"}">`);

	jobList.forEach((item) => {
		// -- Назва компанії / установи та посилання --
		let compName = item.company || "";
		let compHtml = "";

		if (compName) {
			compName = escapeHtml(compName)
				.replace(/\\n/g, "<br>")
				.replace(/\n/g, "<br>");
			const iconBriefcase =
				UI_CLASSES.icons?.briefcaseLine || "ri-briefcase-line";

			if (item.companyLink) {
				const iconExt = "ri-arrow-right-up-line";
				const externalLinkIconClass =
					UI_CLASSES.externalLinkIcon || "external-link-icon";
				const safeUrl = encodeURI(item.companyLink);

				compHtml = `
                    <div class="${UI_CLASSES.jobCompany || "job-company"}">
                        <i class="${iconBriefcase}"></i>
                        <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">
                            ${compName} <i class="${iconExt} ${externalLinkIconClass}"></i>
                        </a>
                    </div>`;
			} else {
				compHtml = `
                    <div class="${UI_CLASSES.jobCompany || "job-company"}">
                        <i class="${iconBriefcase}"></i>
                        <span>${compName}</span>
                    </div>`;
			}
		}

		// -- Мета-дані (Період та Збірна локація) --
		let metaHtml = "";

		// Збираємо локацію з усіх доступних частин у правильному порядку
		const locParts = [item.facility, item.address, item.settlement, item.region]
			.map((part) => (part ? escapeHtml(String(part).trim()) : ""))
			.filter(Boolean);
		const locString = locParts.join(", ");

		if (item.period || locString) {
			const iconCal = UI_CLASSES.icons?.calendarLine || "ri-calendar-line";
			const iconMap = UI_CLASSES.icons?.mapPinLine || "ri-map-pin-line";

			const p = item.period
				? `<span><i class="${iconCal}"></i> ${escapeHtml(item.period)}</span>`
				: "";
			const l = locString
				? `<span><i class="${iconMap}"></i> ${locString}</span>`
				: "";

			metaHtml = `<div class="${UI_CLASSES.jobMeta || "job-meta"}">
                            ${[p, l].filter(Boolean).join(`<span class="${UI_CLASSES.jobSeparator || "job-separator"}">•</span>`)}
                        </div>`;
		}

		// -- Деталі роботи (Посада, форма зайнятості) --
		const detailsList = [];
		const bold = (txt) =>
			`<span class="${UI_CLASSES.jobLabel || "job-label"}">${escapeHtml(txt)}:</span>`;

		const posLabel = i18n.t("taxonomy.jobPosition") || "Посада";
		const formLabel = i18n.t("taxonomy.jobForm") || "Форма зайнятості";

		if (item.position)
			detailsList.push(
				`<div>${bold(posLabel)} ${escapeHtml(item.position)}</div>`,
			);
		if (item.form)
			detailsList.push(
				`<div>${bold(formLabel)} ${escapeHtml(item.form)}</div>`,
			);

		const detailsHtml =
			detailsList.length > 0
				? `<div class="${UI_CLASSES.jobDetails || "job-details"}">${detailsList.join("")}</div>`
				: "";

		// -- Документ (наказ, трудова книжка) --
		let docHtml = "";
		if (item.document) {
			const iconFile = UI_CLASSES.icons?.fileTextLine || "ri-article-line";
			docHtml = `<div class="${UI_CLASSES.jobDoc || "job-document"}">
                           <i class="${iconFile}"></i> ${escapeHtml(item.document)}
                       </div>`;
		}

		// Збираємо картку
		htmlBuffer.push(`
            <div class="${UI_CLASSES.jobCard || "job-card"}">
                ${compHtml}
                ${metaHtml}
                ${detailsHtml}
                ${docHtml}
            </div>
        `);
	});

	htmlBuffer.push(`</div></div>`);
	return htmlBuffer.join("");
}
