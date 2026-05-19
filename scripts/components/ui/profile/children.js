// ./scripts/components/ui/profile/children.js

import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";
import { resolveChildRole } from "../../../utils/genderUtils.js";
import { getFullName } from "../../../utils/personUtils.js";
import { renderPersonTile } from "../shared/personTile.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * Рендерить список карток дітей.
 */
function renderChildList(list, category, ctx) {
	return list
		.map((person) => {
			if (!person) return "";

			const rawRoleLabel = i18n.t(
				`roles.${person.role || resolveChildRole(category, person.gender)}`,
			);
			const roleLabel = escapeHtml(rawRoleLabel);

			return renderPersonTile(person, ctx, roleLabel, false);
		})
		.join("");
}

/**
 * Рендерить секцію для певної категорії дітей (Рідні, Прийомні...).
 */
function renderCategoryGroup(
	marriagesArray, // 🔥 Перейменовано для ясності
	categoryType,
	titleKey,
	defaultTitle,
	ctx,
	showCategoryTitle = true,
) {
	const validMarriages = marriagesArray.filter(
		(m) =>
			Array.isArray(m.children?.[categoryType]) &&
			m.children[categoryType].length > 0,
	);

	if (validMarriages.length === 0) return "";

	const sectionTitleText = escapeHtml(i18n.t(titleKey) || defaultTitle);
	const headerClass = UI_CLASSES.subsectionHeader || "subsection-header";

	const titleHTML = showCategoryTitle
		? `<h3 class="${headerClass}">${sectionTitleText}</h3>`
		: "";

	const blockDividerClass = UI_CLASSES.blockDivider || "block-divider";
	const subsectionDividerClass =
		UI_CLASSES.blockDividerSubsection || "block-divider--subsection";
	const textMutedClass = UI_CLASSES.textMuted || "text-muted";
	const gridClass = UI_CLASSES.kinshipGrid || "kinship-grid";

	const ordinalsGen = i18n.t("time.ordinalsgen");
	const ordArray = Array.isArray(ordinalsGen) ? ordinalsGen : [];
	const fromMarriageTemplate =
		i18n.t("roles.fromMarriageWithOrdinal") || "Від {ordinal} шлюбу з";
	const otherPartnerText = escapeHtml(
		i18n.t("roles.otherPartner") || "Інший партнер / Поза шлюбом",
	);

	const groupsHTML = validMarriages
		.map((m) => {
			// 🔥 Перейменовано змінну циклу на m
			// 🔥 ВИПРАВЛЕНО: Шукаємо m в оригінальному масиві marriagesArray
			const originalIndex = marriagesArray.indexOf(m);
			const childrenList = m.children[categoryType];

			let subTitleHTML = "";

			if (m.spouse) {
				const spouseName = escapeHtml(getFullName(m.spouse));
				const ordinalWord = escapeHtml(
					ordArray[originalIndex] || `${originalIndex + 1}-го`,
				);

				const fromMarriageLabel = escapeHtml(
					fromMarriageTemplate.replace("{ordinal}", ordinalWord),
				);

				subTitleHTML = `${fromMarriageLabel}: <span class="${textMutedClass}">${spouseName}</span>`;
			} else {
				subTitleHTML = otherPartnerText;
			}

			return `
            <div>
                <div class="${blockDividerClass} ${subsectionDividerClass}">
                    <span>${subTitleHTML}</span>
                </div>
                <div class="${gridClass}">
                    ${renderChildList(childrenList, categoryType, ctx)}
                </div>
            </div>
            `;
		})
		.join("");

	return `
        <div>
            ${titleHTML}
            ${groupsHTML}
        </div>
    `;
}

/**
 * Головна функція рендеру блоку "Діти".
 */
export function renderChildrenSection(person) {
	const marriagesArray = person._family?.marriage;

	if (!Array.isArray(marriagesArray) || marriagesArray.length === 0) return "";

	const ctx = person._context;

	const hasStepOrAdopted = marriagesArray.some(
		(m) => m.children?.step?.length > 0 || m.children?.adopted?.length > 0,
	);

	const contentHTML =
		renderCategoryGroup(
			marriagesArray,
			"bio",
			"kinship.bioChildren",
			"Рідні",
			ctx,
			hasStepOrAdopted,
		) +
		renderCategoryGroup(
			marriagesArray,
			"step",
			"kinship.stepChildren",
			"Пасинки / Пасербиці",
			ctx,
			true,
		) +
		renderCategoryGroup(
			marriagesArray,
			"adopted",
			"kinship.adoptedChildren",
			"Прийомні",
			ctx,
			true,
		);

	if (!contentHTML) return "";

	const mainTitle = escapeHtml(i18n.t("profile.children") || "Діти");

	const blockClass = UI_CLASSES.profileBlock || "profile-block";
	const blockHeaderClass =
		UI_CLASSES.profileBlockHeader || "profile-block__header";
	const blockBodyClass = UI_CLASSES.profileBlockBody || "profile-block__body";

	return `
    <section class="${blockClass}">
        <h2 class="${blockHeaderClass}">${mainTitle}</h2>
        <div class="${blockBodyClass}">
             ${contentHTML}
        </div>
    </section>
    `;
}
