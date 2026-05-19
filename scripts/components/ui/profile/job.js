// ./scripts/components/ui/profile/job.js

import { buildJobHtml } from "../formatters/job.js";
import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * РІВЕНЬ UI: Головна функція рендеру блоку "Професійна діяльність" (Робота)
 * Оптимізовано: усунуто фолбеки класів та скорочено перевірки масиву.
 */
export function renderJobBlock(person) {
	const jobList = person?._job;

	if (!Array.isArray(jobList) || jobList.length === 0) {
		return "";
	}

	const recordsHTML = buildJobHtml(jobList);

	if (!recordsHTML || !recordsHTML.trim()) {
		return "";
	}

	const sectionTitle = escapeHtml(
		i18n.t("profile.job") || "Професійна діяльність",
	);

	return `
    <section class="${UI_CLASSES.profileBlock}">
        <h2 class="${UI_CLASSES.profileBlockHeader}">${sectionTitle}</h2>
        <div class="${UI_CLASSES.profileBlockBody}">
            ${recordsHTML}
        </div>
    </section>
    `;
}
