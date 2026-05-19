// ./scripts/components/ui/profile/spiritualKinship.js

import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";
import { renderPersonTile } from "../shared/personTile.js";
import { resolveSpiritualRole } from "../../../utils/genderUtils.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * Генерація масиву карток духовного споріднення.
 * Оптимізовано: делегування логіки визначення ролі в genderUtils.
 */
function renderSpiritualList(list, defaultRoleKey, ctx) {
	if (!Array.isArray(list) || list.length === 0) return "";

	return list
		.map((person) => {
			if (!person || person._isMissing) return "";

			const roleLabelRaw = resolveSpiritualRole(person, defaultRoleKey);
			const safeRoleLabel = escapeHtml(roleLabelRaw || "");

			return renderPersonTile(person, ctx, safeRoleLabel, false);
		})
		.join("");
}

/**
 * Формування ізольованої секції з лінійним розділювачем.
 */
function renderSpiritualGroup(
	personList,
	titleKey,
	defaultTitle,
	defaultRoleKey,
	ctx,
) {
	if (!Array.isArray(personList) || personList.length === 0) return "";

	const sectionTitleTextRaw = i18n.t(titleKey) || defaultTitle;
	const sectionTitleText = escapeHtml(sectionTitleTextRaw);

	const dividerClass = UI_CLASSES.blockDivider || "block-divider";
	const gridClass = UI_CLASSES.kinshipGrid || "kinship-grid";

	return `
        <div>
            <div class="${dividerClass}">
                <span>${sectionTitleText}</span>
            </div>
            <div class="${gridClass}">
                ${renderSpiritualList(personList, defaultRoleKey, ctx)}
            </div>
        </div>
    `;
}

/**
 * Головний контролер рендеру блоку духовних зв'язків.
 */
export function renderSpiritualSection(person) {
	const spiritual = person?._spiritual;
	if (!spiritual) return "";

	const ctx = person._context;

	const godchildren = Array.isArray(spiritual.godchildren)
		? spiritual.godchildren
		: [];
	const cogodparents = Array.isArray(spiritual.cogodparents)
		? spiritual.cogodparents
		: [];

	if (godchildren.length === 0 && cogodparents.length === 0) {
		return "";
	}

	let contentHTML = "";

	contentHTML += renderSpiritualGroup(
		godchildren,
		"kinship.godchildrenTitle",
		"Похресники",
		"godchild",
		ctx,
	);

	contentHTML += renderSpiritualGroup(
		cogodparents,
		"kinship.cogodparentsTitle",
		"Куми",
		"cogodparent",
		ctx,
	);

	if (!contentHTML) return "";

	const mainTitleRaw =
		i18n.t("profile.spiritualKinship") || "Духовне споріднення";
	const mainTitle = escapeHtml(mainTitleRaw);

	const blockClass = UI_CLASSES.profileBlock || "profile-block";
	const headerClass = UI_CLASSES.profileBlockHeader || "profile-block__header";
	const bodyClass = UI_CLASSES.profileBlockBody || "profile-block__body";

	return `
    <section class="${blockClass}">
        <h2 class="${headerClass}">${mainTitle}</h2>
        <div class="${bodyClass}">
             ${contentHTML}
        </div>
    </section>
    `;
}
