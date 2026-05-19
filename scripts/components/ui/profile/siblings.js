// ./scripts/components/ui/profile/siblings.js

import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";
import { resolveSiblingRole } from "../../../utils/genderUtils.js";
import { renderPersonTile } from "../shared/personTile.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * Рендерить сітку карток сиблінгів.
 * Оптимізовано: усунуто повторний пошук персон у базі.
 */
function renderSiblingsGrid(list, ctx, currentId) {
	if (!Array.isArray(list) || list.length === 0) return "";

	const safeCurrentId = String(currentId || "").trim();
	const processedIds = new Set();

	const tilesHTML = list
		.map((person) => {
			// Очікується збагачений об'єкт персони від процесора
			if (!person || !person.id || person._isMissing) return "";

			const id = String(person.id).trim();

			if (id === safeCurrentId || processedIds.has(id)) return "";
			processedIds.add(id);

			const rawRoleLabel = resolveSiblingRole(person, person.role);
			const roleLabel = escapeHtml(rawRoleLabel);

			return renderPersonTile(person, ctx, roleLabel, false);
		})
		.join("");

	if (!tilesHTML) return "";

	const gridClass = UI_CLASSES.kinshipGrid || "kinship-grid";
	return `<div class="${gridClass}">${tilesHTML}</div>`;
}

/**
 * Рендерить групу сиблінгів (наприклад "Рідні" або "Зведені").
 */
function renderSiblingGroup(
	list,
	titleKey,
	defaultTitle,
	ctx,
	currentId,
	showTitle = true,
) {
	if (!Array.isArray(list) || list.length === 0) return "";

	const gridHTML = renderSiblingsGrid(list, ctx, currentId);
	if (!gridHTML) return "";

	let titleHTML = "";

	if (showTitle) {
		const title = escapeHtml(i18n.t(titleKey) || defaultTitle);
		const dividerClass = UI_CLASSES.blockDivider || "block-divider";
		const subClass =
			UI_CLASSES.blockDividerSubsection || "block-divider--subsection";

		titleHTML = `
            <div class="${dividerClass} ${subClass}">
                <span>${title}</span>
            </div>
        `;
	}

	return `
        <div>
            ${titleHTML}
            ${gridHTML}
        </div>
    `;
}

/**
 * РІВЕНЬ UI: Головна функція рендеру секції "Брати та Сестри".
 */
export function renderSiblingsSection(person) {
	const fam = person?._family;
	if (!fam || !fam.siblings) return "";

	const ctx = person._context;
	const myId = person.id;
	const siblings = fam.siblings;

	const full = Array.isArray(siblings.full) ? siblings.full : [];
	const halfP = Array.isArray(siblings.half_p) ? siblings.half_p : [];
	const halfM = Array.isArray(siblings.half_m) ? siblings.half_m : [];
	const step = Array.isArray(siblings.step) ? siblings.step : [];

	const totalCount = full.length + halfP.length + halfM.length + step.length;
	if (totalCount === 0) return "";

	const hasOtherSiblings =
		halfP.length > 0 || halfM.length > 0 || step.length > 0;
	const showFullTitle = hasOtherSiblings;

	let contentHTML = "";

	contentHTML += renderSiblingGroup(
		full,
		"siblings.full",
		"Рідні",
		ctx,
		myId,
		showFullTitle,
	);

	contentHTML += renderSiblingGroup(
		halfP,
		"siblings.consanguine",
		"Єдинокровні (по татові)",
		ctx,
		myId,
		true,
	);

	contentHTML += renderSiblingGroup(
		halfM,
		"siblings.uterine",
		"Єдиноутробні (по мамі)",
		ctx,
		myId,
		true,
	);

	contentHTML += renderSiblingGroup(
		step,
		"siblings.step",
		"Зведені",
		ctx,
		myId,
		true,
	);

	if (!contentHTML) return "";

	const sectionTitle = escapeHtml(
		i18n.t("profile.siblings") || "Брати та сестри",
	);
	const blockClass = UI_CLASSES.profileBlock || "profile-block";
	const headerClass = UI_CLASSES.profileBlockHeader || "profile-block__header";
	const bodyClass = UI_CLASSES.profileBlockBody || "profile-block__body";

	return `
    <section class="${blockClass}">
        <h2 class="${headerClass}">${sectionTitle}</h2>
        <div class="${bodyClass}">
            ${contentHTML}
        </div>
    </section>
    `;
}
