// ./scripts/components/ui/formatters/identity.js

import { UI_CLASSES } from "../../../core/uiClasses.js";
import { i18n } from "../../../core/i18n.js";
import { makeRow } from "../shared/rows.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * Універсальний генератор чипів.
 * Трансформує масиви у набір ізольованих тегів.
 * Здійснює жорстку фільтрацію порожніх артефактів бази даних.
 */
function buildComplexChips(data, extractFn) {
	if (!data || !Array.isArray(data) || data.length === 0) return "";

	const chips = data
		.map((item) => {
			if (!item) return null;

			if (typeof item === "string") {
				const trimmed = item.trim();
				return trimmed
					? `<span class="profile-name-tag">${escapeHtml(trimmed)}</span>`
					: null;
			}

			const content = extractFn(item);
			if (!content || !content.trim()) return null;

			return `<span class="profile-name-tag">${content}</span>`; // content вже екранований в extractFn
		})
		.filter(Boolean)
		.join("");

	return chips
		? `<div class="profile-tags-wrapper identity-tags-spacing">${chips}</div>`
		: "";
}

/**
 * РІВЕНЬ UI: Форматер секції "Ідентичність та статус".
 * Оптимізовано через буферизацію та повне екранування.
 */
export function buildIdentityHtml(identity) {
	if (!identity || Object.keys(identity).length === 0) return "";

	const htmlBuffer = [];
	htmlBuffer.push(
		`<div class="${UI_CLASSES.identityContainer || "identity-container"}">`,
	);
	let hasContent = false;

	// --- 1. Текстові вузли (Суспільний стан, Віросповідання) ---
	const estateLabel = i18n.t("profile.estate") || "Суспільний стан";
	const estateRow = makeRow(estateLabel, identity.estate); // makeRow зазвичай має власний механізм екранування
	if (estateRow) {
		htmlBuffer.push(estateRow);
		hasContent = true;
	}

	const beliefLabel = i18n.t("profile.belief") || "Віросповідання";
	const beliefRow = makeRow(beliefLabel, identity.belief);
	if (beliefRow) {
		htmlBuffer.push(beliefRow);
		hasContent = true;
	}

	// Оптичний розрив перед масивами тегів
	if (
		hasContent &&
		(identity.citizenship || identity.nationality || identity.languages)
	) {
		const spacerClass = UI_CLASSES.spacerM || "spacer-m"; // Заміна інлайн-стилю на клас
		htmlBuffer.push(`<div class="${spacerClass}"></div>`);
	}

	// --- 2. Громадянство / Підданство (Суто текстова семантика) ---
	const citizenshipChips = buildComplexChips(identity.citizenship, (c) => {
		const safePeriod = escapeHtml(c.period || "");
		const safeCountry = escapeHtml(c.country || "");
		const period = safePeriod
			? ` <span class="${UI_CLASSES.dataRowMeta || "data-row__meta"}">(${safePeriod})</span>`
			: "";
		return `${safeCountry}${period}`;
	});

	if (citizenshipChips) {
		hasContent = true;
		const label = escapeHtml(
			i18n.t("profile.citizenship") || "Громадянство (Підданство)",
		);
		htmlBuffer.push(`
            <div class="${UI_CLASSES.blockDivider || "block-divider"}"><span>${label}</span></div>
            <div class="identity-section-body">
                ${citizenshipChips}
            </div>
        `);
	}

	// --- 3. Національність / Етнічне походження ---
	const nationalityChips = buildComplexChips(identity.nationality, (n) => {
		const safePart = escapeHtml(n.part || "");
		const safeNation = escapeHtml(n.nation || "");
		const part = safePart
			? ` <span class="${UI_CLASSES.dataRowMeta || "data-row__meta"}">(${safePart})</span>`
			: "";
		return `${safeNation}${part}`;
	});

	if (nationalityChips) {
		hasContent = true;
		const label = escapeHtml(i18n.t("profile.nationality") || "Національність");
		htmlBuffer.push(`
            <div class="${UI_CLASSES.blockDivider || "block-divider"}"><span>${label}</span></div>
            <div class="identity-section-body">
                ${nationalityChips}
            </div>
        `);
	}

	// --- 4. Лінгвістичний профіль ---
	const langChips = buildComplexChips(identity.languages, (l) => {
		const safeLevel = escapeHtml(l.level || "");
		const safeLang = escapeHtml(l.lang || "");
		const level = safeLevel
			? ` <span class="${UI_CLASSES.dataRowMeta || "data-row__meta"}">(${safeLevel})</span>`
			: "";
		return `${safeLang}${level}`;
	});

	if (langChips) {
		hasContent = true;
		const label = escapeHtml(i18n.t("profile.languages") || "Володіння мовами");
		htmlBuffer.push(`
            <div class="${UI_CLASSES.blockDivider || "block-divider"}"><span>${label}</span></div>
            <div class="identity-section-body">
                ${langChips}
            </div>
        `);
	}

	htmlBuffer.push(`</div>`);

	return hasContent ? htmlBuffer.join("") : "";
}
