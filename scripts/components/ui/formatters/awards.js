// ./scripts/components/ui/formatters/awards.js

import { UI_CLASSES } from "../../../core/uiClasses.js";
import { i18n } from "../../../core/i18n.js";
import { escapeHtml, convertDriveLink } from "../../../utils/helpers.js";

/**
 * РІВЕНЬ UI: Формує HTML для вкладки "Нагороди та відзнаки".
 * Формат: компактна горизонтальна плитка (іконка + текстова група).
 * Толерантна до частково відсутніх даних (graceful degradation).
 * @param {Array} awardsList - Масив об'єктів нагород з профілю (person._awards)
 * @returns {string} HTML-розмітка
 */
export function buildAwardsHtml(awardsList) {
	if (!awardsList || !Array.isArray(awardsList) || awardsList.length === 0) {
		return "";
	}

	const containerClass = UI_CLASSES.awardsContainer || "awards-container";
	const gridClass = UI_CLASSES.awardsList || "awards-grid";
	const iconDefaultAlt = i18n.t("taxonomy.awardsIconAlt") || "Іконка нагороди";

	const htmlBuffer = [];
	htmlBuffer.push(`<div class="${containerClass}"><div class="${gridClass}">`);

	let validItemsCount = 0;

	awardsList.forEach((item) => {
		// М'яка фільтрація: картка генерується, якщо є хоча б одне інформативне поле
		if (!item.title && !item.icon && !item.date && !item.url) return;

		validItemsCount++;

		// 1. Заголовок
		let titleName = "";
		let titleContent = "";

		if (item.title) {
			titleName = escapeHtml(item.title)
				.replace(/\\n/g, "<br>")
				.replace(/\n/g, "<br>");
			titleContent = titleName;

			if (item.url) {
				const safeUrl = encodeURI(item.url);
				titleContent = `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="js-stop-propagation">${titleName}</a>`;
			}
		}

		// 2. Іконка (з фолбеком на стандартну медаль, якщо іконки немає, але є інші дані)
		let iconHtml = "";
		if (item.icon && (item.icon.includes("/") || item.icon.includes("."))) {
			const imgClass = UI_CLASSES.awardTileIconImg || "award-tile-icon-img";
			let rawIcon = String(item.icon).trim();
			if (rawIcon.includes("drive.google.com")) {
				rawIcon = convertDriveLink(rawIcon);
			}
			// Не допускати подвійного кодування (%2C -> %252C тощо)
			let safeIconUrl = rawIcon;
			if (/%[0-9A-Fa-f]{2}/.test(rawIcon)) {
				safeIconUrl = rawIcon.replace(/ /g, "%20");
			} else {
				safeIconUrl = encodeURI(rawIcon);
			}
			const fallbackIcon = escapeHtml(UI_CLASSES.icons?.medalLine || "ri-medal-line");
			iconHtml = `<img src="${escapeHtml(safeIconUrl)}" alt="${escapeHtml(item.title || iconDefaultAlt)}" class="${imgClass}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null; this.parentElement.innerHTML='<i class=\'${fallbackIcon}\'></i>';">`;
		} else {
			const iconClass =
				item.icon || UI_CLASSES.icons?.medalLine || "ri-medal-line";
			iconHtml = `<i class="${escapeHtml(iconClass)}"></i>`;
		}

		// 3. Мета-дані (дата)
		let metaHtml = "";
		if (item.date) {
			const iconCal = UI_CLASSES.icons?.calendarLine || "ri-calendar-line";
			const safeDate = escapeHtml(item.date);
			metaHtml = `<div class="${UI_CLASSES.awardTileMeta || "award-tile-meta"}"><i class="${iconCal}"></i> ${safeDate}</div>`;
		}

		// 4. Компонування блоку. Якщо заголовка немає, title-блок просто не рендериться.
		const titleHtml = titleContent
			? `<div class="${UI_CLASSES.awardTileTitle || "award-tile-title"}">${titleContent}</div>`
			: "";

		htmlBuffer.push(`
            <div class="${UI_CLASSES.awardTile || "award-tile"}">
                <div class="${UI_CLASSES.awardTileIconWrapper || "award-tile-icon-wrapper"}">
                    ${iconHtml}
                </div>
                <div class="${UI_CLASSES.awardTileGroup || "award-tile-group"}">
                    ${titleHtml}
                    ${metaHtml}
                </div>
            </div>
        `);
	});

	if (validItemsCount === 0) return "";

	htmlBuffer.push(`</div></div>`);
	return htmlBuffer.join("");
}
