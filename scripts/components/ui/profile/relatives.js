// ./scripts/components/ui/profile/relatives.js

import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";
import { resolveRoleLabel } from "../../../utils/genderUtils.js";
import { renderPersonTile } from "../shared/personTile.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * Рендерить сітку родичів одного рівня.
 * Оптимізовано: усунуто повторний пошук (findPersonDetails), очікуються збагачені об'єкти.
 */
function renderRelativesGrid(list, ctx) {
	if (!Array.isArray(list) || list.length === 0) return "";

	const processedIds = new Set();

	const tilesHTML = list
		.map((person) => {
			if (!person || !person.id || person._isMissing) return "";
			if (processedIds.has(person.id)) return "";

			processedIds.add(person.id);

			const roleKey = person.role || "";
			const rawRoleLabel = resolveRoleLabel(person, roleKey);
			const roleLabel = escapeHtml(rawRoleLabel);

			return renderPersonTile(person, ctx, roleLabel, false, { showId: true });
		})
		.join("");

	if (!tilesHTML) return "";

	const gridClass = UI_CLASSES.kinshipGrid || "kinship-grid";
	return `<div class="${gridClass}">${tilesHTML}</div>`;
}

/**
 * Рендерить групу родичів певного рівня (наприклад, "2-юрідні").
 */
function renderLevelGroup(level, list, ctx) {
	const gridHtml = renderRelativesGrid(list, ctx);
	if (!gridHtml) return "";

	let template = i18n.t("roles.cousinsLevel");
	if (!template) {
		template = "{level}-юрідні";
	}
	const rawLevelLabel = template.replace("{level}", level);
	const levelLabel = escapeHtml(rawLevelLabel);

	const subsectionClass = UI_CLASSES.subsection || "subsection";
	const headerClass = UI_CLASSES.subsectionHeader || "subsection-header";
	const mutedClass =
		UI_CLASSES.subsectionHeaderMuted || "subsection-header--muted";

	return `
        <div class="${subsectionClass}">
            <div class="${headerClass} ${mutedClass}">
                ${levelLabel}
            </div>
            ${gridHtml}
        </div>
    `;
}

/**
 * Рендерить блок певної лінії (по батькові або по матері).
 */
function renderSideBlock(sideKey, titleKey, defaultTitle, relativesData, ctx) {
	if (!Array.isArray(relativesData)) return "";

	const levelsHTML = relativesData
		.map((lvl) => {
			const list = lvl[sideKey];
			if (!Array.isArray(list) || list.length === 0) return "";
			return renderLevelGroup(lvl.level, list, ctx);
		})
		.join("");

	if (!levelsHTML) return "";

	const sideTitle = escapeHtml(i18n.t(titleKey) || defaultTitle);

	const sideClass = UI_CLASSES.relativesSide || "relatives-side";
	const dividerClass = UI_CLASSES.blockDivider || "block-divider";
	const dividerRelClass =
		UI_CLASSES.blockDividerRelatives || "block-divider--relatives";
	const contentClass =
		UI_CLASSES.relativesSideContent || "relatives-side__content";

	return `
        <div class="${sideClass}">
            <div class="${dividerClass} ${dividerRelClass}">
                <span>${sideTitle}</span>
            </div>
            <div class="${contentClass}">
                ${levelsHTML}
            </div>
        </div>
    `;
}

/**
 * РІВЕНЬ UI: Головна функція рендеру блоку "Родичі"
 */
export function renderRelativesSection(person) {
	const fam = person?._family;
	const ctx = person?._context;

	if (!Array.isArray(fam?.relatives) || fam.relatives.length === 0) {
		return "";
	}

	const patBlock = renderSideBlock(
		"pat",
		"kinship.paternalLine",
		"По татовій лінії",
		fam.relatives,
		ctx,
	);

	const matBlock = renderSideBlock(
		"mat",
		"kinship.maternalLine",
		"По маминій лінії",
		fam.relatives,
		ctx,
	);

	if (!patBlock && !matBlock) {
		return "";
	}

	const sectionTitle = escapeHtml(i18n.t("profile.relatives") || "Родичі");

	const blockClass = UI_CLASSES.profileBlock || "profile-block";
	const headerClass = UI_CLASSES.profileBlockHeader || "profile-block__header";
	const bodyClass = UI_CLASSES.profileBlockBody || "profile-block__body";

	return `
    <section class="${blockClass}">
        <h2 class="${headerClass}">${sectionTitle}</h2>
        <div class="${bodyClass}">
            ${patBlock}
            ${matBlock}
        </div>
    </section>
    `;
}
