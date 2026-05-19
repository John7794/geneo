// ./scripts/components/ui/formatters/personal.js

import { UI_CLASSES } from "../../../core/uiClasses.js";
import { i18n } from "../../../core/i18n.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * Універсальний генератор тегів.
 * Трансформує будь-які вхідні дані (рядки чи масиви) у візуальні капсули.
 * Оптимізовано: санітизація, вилучення інлайн-стилів.
 */
function buildChipsHtml(data) {
	if (!data) return "";

	const items = Array.isArray(data) ? data : [data];
	if (items.length === 0) return "";

	const chips = items
		.filter((item) => item && String(item).trim() !== "")
		.map(
			(item) =>
				`<span class="profile-name-tag">${escapeHtml(String(item).trim())}</span>`,
		)
		.join("");

	const spacerClass = UI_CLASSES.spacerTopS || "spacer-top-s"; // Заміна margin-top: 8px
	return chips
		? `<div class="profile-tags-wrapper ${spacerClass}">${chips}</div>`
		: "";
}

/**
 * Рендерить секцію зовнішності у вигляді тегів.
 * Комбінує характеристику та її значення в один чип.
 */
function buildAppearanceHtml(appearanceData) {
	if (!appearanceData) return "";

	if (Array.isArray(appearanceData)) {
		const chips = appearanceData
			.map((item) => {
				const charRaw = item.char ? String(item.char).trim() : "";
				const valRaw = item.value ? String(item.value).trim() : "";

				if (!charRaw && !valRaw) return null;

				const char = escapeHtml(charRaw);
				const val = escapeHtml(valRaw);

				const content = char && val ? `${char}: ${val}` : char || val;

				return `<span class="profile-name-tag">${content}</span>`;
			})
			.filter(Boolean)
			.join("");

		const spacerClass = UI_CLASSES.spacerTopS || "spacer-top-s"; // Заміна margin-top: 8px
		return chips
			? `<div class="profile-tags-wrapper ${spacerClass}">${chips}</div>`
			: "";
	}

	return buildChipsHtml(appearanceData);
}

/**
 * Рендерить секцію домашніх улюбленців у вигляді тегів із хронологією.
 */
function buildPetsHtml(petsData) {
	if (!petsData) return "";

	if (Array.isArray(petsData)) {
		const chips = petsData
			.map((pet) => {
				const nickRaw = pet.nick ? String(pet.nick).trim() : "";
				if (!nickRaw) return null;

				const nick = escapeHtml(nickRaw);
				const safePeriod = escapeHtml(pet.period || "");

				const period = safePeriod
					? ` <span class="${UI_CLASSES.dataRowMeta || "data-row__meta"}">(${safePeriod})</span>`
					: "";

				return `<span class="profile-name-tag">${nick}${period}</span>`;
			})
			.filter(Boolean)
			.join("");

		const spacerClass = UI_CLASSES.spacerTopS || "spacer-top-s"; // Заміна margin-top: 8px
		return chips
			? `<div class="profile-tags-wrapper ${spacerClass}">${chips}</div>`
			: "";
	}

	return buildChipsHtml(petsData);
}

/**
 * Допоміжна функція для генерації підрозділу з універсальним розділювачем.
 */
function buildSection(titleKey, fallbackTitle, contentHtml) {
	if (!contentHtml || contentHtml.trim() === "") return "";

	const titleRaw = i18n.t(titleKey) || fallbackTitle;
	const title = escapeHtml(titleRaw);

	const spacerClass = UI_CLASSES.spacerBottomL || "spacer-bottom-l"; // Заміна margin-bottom: 24px

	return `
        <div class="${UI_CLASSES.blockDivider || "block-divider"}"><span>${title}</span></div>
        <div class="${spacerClass}">
            ${contentHtml}
        </div>
    `;
}

/**
 * РІВЕНЬ UI: Головна функція форматування особистого портрета.
 * Оптимізовано через буферизацію масивів.
 */
export function buildPersonalHtml(personal) {
	if (!personal || Object.keys(personal).length === 0) return "";

	const htmlBuffer = [];
	htmlBuffer.push(
		`<div class="${UI_CLASSES.personalContainer || "personal-container"}">`,
	);

	htmlBuffer.push(
		buildSection(
			"profile.lifePeriod",
			"Життєвий етап",
			buildChipsHtml(personal.lifePeriod),
		),
	);

	htmlBuffer.push(
		buildSection(
			"profile.appearance",
			"Зовнішність",
			buildAppearanceHtml(personal.appearance),
		),
	);

	htmlBuffer.push(
		buildSection(
			"profile.temperament",
			"Характер",
			buildChipsHtml(personal.temperament),
		),
	);

	htmlBuffer.push(
		buildSection(
			"profile.lifestyle",
			"Спосіб життя",
			buildChipsHtml(personal.lifestyle),
		),
	);

	htmlBuffer.push(
		buildSection("profile.hobby", "Захоплення", buildChipsHtml(personal.hobby)),
	);

	htmlBuffer.push(
		buildSection(
			"profile.pets",
			"Домашні улюбленці",
			buildPetsHtml(personal.pets),
		),
	);

	htmlBuffer.push(
		buildSection(
			"profile.socioPoliticalActivity",
			"Суспільно-політична діяльність",
			buildChipsHtml(personal.activity),
		),
	);

	htmlBuffer.push(
		buildSection(
			"profile.property",
			"Майно",
			buildChipsHtml(personal.property),
		),
	);

	htmlBuffer.push(`</div>`);
	return htmlBuffer.join("");
}
