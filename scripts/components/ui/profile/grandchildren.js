// ./scripts/components/ui/profile/grandchildren.js

import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";
import { resolveGrandChildRole } from "../../../utils/genderUtils.js";
import { getFullName } from "../../../utils/personUtils.js";
import { renderPersonTile } from "../shared/personTile.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * Рендерить сітку карток онуків.
 * Оптимізовано: захист від undefined role та екранування ролі.
 */
function renderGrandChildCards(list, ctx) {
	if (!Array.isArray(list) || list.length === 0) return "";

	return list
		.map((person) => {
			if (!person) return "";

			const safeRole = (person.role || "").toLowerCase();
			const rawRoleLabel = resolveGrandChildRole(person, safeRole);
			const roleLabel = escapeHtml(rawRoleLabel);

			return renderPersonTile(person, ctx, roleLabel, false, { showId: true });
		})
		.join("");
}

/**
 * Рендерить блок онуків від конкретної дитини (наприклад "Діти Івана")
 * Оптимізовано: санітизація імені дитини та мітки.
 */
function renderGrandchildrenForChild(child, gcMap, ctx) {
	const grandKids = gcMap[child.id];
	if (!Array.isArray(grandKids) || grandKids.length === 0) return "";

	const rawChildName = getFullName(child);
	const childName = escapeHtml(rawChildName);
	const label = escapeHtml(i18n.t("profile.children") || "Діти");

	const columnClass = UI_CLASSES.descendantsColumn || "descendants-column";
	const columnFullClass =
		UI_CLASSES.descendantsColumnFull || "descendants-column--full";
	const blockDividerClass = UI_CLASSES.blockDivider || "block-divider";
	const compactDividerClass =
		UI_CLASSES.blockDividerCompact || "block-divider--compact";
	const textMutedClass = UI_CLASSES.textMuted || "text-muted";
	const gridClass = UI_CLASSES.kinshipGrid || "kinship-grid";

	return `
        <div class="${columnClass} ${columnFullClass}">
            <div class="${blockDividerClass} ${compactDividerClass}">
                <span>${label}: <span class="${textMutedClass}">${childName}</span></span>
            </div>
            
            <div class="${gridClass}">
                ${renderGrandChildCards(grandKids, ctx)}
            </div>
        </div>
    `;
}

/**
 * Рендерить секцію онуків для конкретного шлюбу профілю
 * Оптимізовано: санітизація імені партнера та шаблону шлюбу.
 */
function renderMarriageBlock(marriage, index, gcMap, ctx) {
	const allChildrenInMarriage = [
		...(marriage.children?.bio || []),
		...(marriage.children?.step || []),
		...(marriage.children?.adopted || []),
	];

	if (allChildrenInMarriage.length === 0) return "";

	const grandchildrenHTML = allChildrenInMarriage
		.map((child) => renderGrandchildrenForChild(child, gcMap, ctx))
		.join("");

	if (!grandchildrenHTML) return "";

	let subTitleHTML = "";
	const textMutedClass = UI_CLASSES.textMuted || "text-muted";

	if (marriage.spouse) {
		const spouseName = escapeHtml(getFullName(marriage.spouse));

		const ordinalsGen = i18n.t("time.ordinalsgen");
		const ordArray = Array.isArray(ordinalsGen) ? ordinalsGen : [];
		const ordinalWord = escapeHtml(ordArray[index] || `${index + 1}-го`);

		let fromMarriageTemplate = i18n.t("roles.fromMarriageWithOrdinal");
		if (!fromMarriageTemplate) {
			fromMarriageTemplate = "Від {ordinal} шлюбу з";
		}

		const fromMarriageLabel = escapeHtml(
			fromMarriageTemplate.replace("{ordinal}", ordinalWord),
		);

		subTitleHTML = `${fromMarriageLabel}: <span class="${textMutedClass}">${spouseName}</span>`;
	} else {
		const otherPartnerText = escapeHtml(
			i18n.t("roles.otherPartner") || "Інший партнер / Поза шлюбом",
		);
		subTitleHTML = otherPartnerText;
	}

	const blockDividerClass = UI_CLASSES.blockDivider || "block-divider";
	const subsectionDividerClass =
		UI_CLASSES.blockDividerSubsection || "block-divider--subsection";
	const columnsClass = UI_CLASSES.descendantsColumns || "descendants-columns";
	const stackedClass =
		UI_CLASSES.descendantsColumnsStacked || "descendants-columns--stacked";

	return `
        <div>
            <div class="${blockDividerClass} ${subsectionDividerClass}">
                <span>${subTitleHTML}</span>
            </div>
            <div class="${columnsClass} ${stackedClass}">
                ${grandchildrenHTML}
            </div>
        </div>
    `;
}

/**
 * Головна функція рендеру блоку "Онуки"
 * Оптимізовано: санітизація заголовка секції.
 */
export function renderGrandchildrenSection(person) {
	const fam = person._family;
	const ctx = person._context;

	if (!fam || !Array.isArray(fam.marriage) || !fam.grandChildrenMap) return "";

	const marriage = fam.marriage;
	const gcMap = fam.grandChildrenMap;

	const hasAnyGrandChildren = Object.keys(gcMap).length > 0;
	if (!hasAnyGrandChildren) return "";

	const contentHTML = marriage
		.map((m, idx) => renderMarriageBlock(m, idx, gcMap, ctx))
		.join("");

	if (!contentHTML) return "";

	const sectionTitle = escapeHtml(i18n.t("profile.grandChildren") || "Онуки");

	const blockClass = UI_CLASSES.profileBlock || "profile-block";
	const headerClass = UI_CLASSES.profileBlockHeader || "profile-block-header";
	const bodyClass = UI_CLASSES.profileBlockBody || "profile-block-body";

	return `
    <section class="${blockClass}">
        <h2 class="${headerClass}">${sectionTitle}</h2>
        <div class="${bodyClass}">
             ${contentHTML}
        </div>
    </section>
    `;
}
