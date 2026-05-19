// ./scripts/components/ui/profile/grandparents.js

import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";
import { renderPersonTile } from "../shared/personTile.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * Рендерить гілку предків (батьківську або материнську).
 * Оптимізовано: усунуто повторний пошук персон.
 */
function renderBranch(peopleList, defaultTitle, ctx) {
	if (!Array.isArray(peopleList) || peopleList.length === 0) {
		return "";
	}

	const validPeople = peopleList.filter((p) => p && p.id && !p._isMissing);
	if (validPeople.length === 0) return "";

	const safeTitle = escapeHtml(defaultTitle);

	const tilesHTML = validPeople
		.map((person) => {
			const roleKey =
				person.role === "grandfather"
					? "roles.grandfather"
					: person.role === "grandmother"
						? "roles.grandmother"
						: "roles.grandparent";

			const roleLabel = escapeHtml(i18n.t(roleKey) || "ДІДУСЬ / БАБУСЯ");

			return renderPersonTile(person, ctx, roleLabel, false);
		})
		.join("");

	const branchClass = UI_CLASSES.ancestorBranch || "ancestor-branch";
	const dividerClass = UI_CLASSES.blockDivider || "block-divider";
	const listClass = UI_CLASSES.ancestorBranchList || "ancestor-branch__list";

	return `
        <div class="${branchClass}">
            <div class="${dividerClass}">
                <span>${safeTitle}</span>
            </div>
            <div class="${listClass}">
                ${tilesHTML}
            </div>
        </div>
    `;
}

/**
 * Головна функція рендеру блоку "Дідусі та бабусі".
 * Відновлено клас grandparents-grid для збереження верстки.
 */
export function renderGrandparentsSection(person) {
	const fam = person._family?.grandparents;
	if (!fam) return "";

	const ctx = person._context;

	const paternalList = Array.isArray(fam.paternal) ? fam.paternal : [];
	const maternalList = Array.isArray(fam.maternal) ? fam.maternal : [];

	if (paternalList.length === 0 && maternalList.length === 0) return "";

	const paternalTitle = i18n.t("kinship.paternalLine") || "ПО ТАТОВІ";
	const paternalHTML = renderBranch(paternalList, paternalTitle, ctx);

	const maternalTitle = i18n.t("kinship.maternalLine") || "ПО МАМИНІЙ ЛІНІЇ";
	const maternalHTML = renderBranch(maternalList, maternalTitle, ctx);

	if (!paternalHTML && !maternalHTML) return "";

	const sectionTitle = escapeHtml(
		i18n.t("profile.grandparents") || "Дідусі та бабусі",
	);

	const blockClass = UI_CLASSES.profileBlock || "profile-block";
	const headerClass = UI_CLASSES.profileBlockHeader || "profile-block__header";
	const bodyClass = UI_CLASSES.profileBlockBody || "profile-block__body";

	return `
    <section class="${blockClass}">
        <h2 class="${headerClass}">${sectionTitle}</h2>
        <div class="${bodyClass}">
            <div class="grandparents-grid">
                ${paternalHTML}
                ${maternalHTML}
            </div>
        </div>
    </section>
    `;
}
