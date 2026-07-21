// ./scripts/components/ui/profile/parents.js

import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";
import { renderPersonTile } from "../shared/personTile.js";
import {
	resolveParentRole,
	normalizeGender,
} from "../../../utils/genderUtils.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * Рендерить групу батьків (рідні, прийомні, тощо).
 * Оптимізовано: усунуто повторний пошук у базі. Робота ведеться з готовими об'єктами.
 */
function renderParentGroup(titleKey, defaultTitle, peopleList, ctx, type) {
	if (!Array.isArray(peopleList) || peopleList.length === 0) {
		return "";
	}

	// Відсікаємо пошкоджені або порожні записи
	const validPeople = peopleList.filter((p) => p && p.id && !p._isMissing);
	if (validPeople.length === 0) return "";

	// Сортування: Чоловік (ліворуч) -> Жінка (праворуч)
	const male = validPeople.find((p) => normalizeGender(p.gender) === "m");
	const female = validPeople.find((p) => normalizeGender(p.gender) === "f");
	const others = validPeople.filter((p) => p !== male && p !== female);

	let tilesHTML = "";

	// Логіка позиціонування для 2-колонкової сітки
	if (male) {
		const safeRole = escapeHtml(resolveParentRole(type, male.gender));
		tilesHTML += `<div class="${UI_CLASSES.parentTileWrapper}">${renderPersonTile(male, ctx, safeRole, false, { showId: true })}</div>`;
	} else if (female) {
		// Якщо тата/вітчима немає, додаємо пустий блок, щоб жінка пішла в праву колонку
		tilesHTML += `<div class="${UI_CLASSES.parentTileEmpty}"></div>`;
	}

	if (female) {
		const safeRole = escapeHtml(resolveParentRole(type, female.gender));
		tilesHTML += `<div class="${UI_CLASSES.parentTileWrapper}">${renderPersonTile(female, ctx, safeRole, false, { showId: true })}</div>`;
	}

	// Рендеримо інших (якщо раптом більше 2-х осіб в групі)
	others.forEach((p) => {
		const safeRole = escapeHtml(resolveParentRole(type, p.gender));
		tilesHTML += `<div class="${UI_CLASSES.parentTileWrapper}">${renderPersonTile(p, ctx, safeRole, false, { showId: true })}</div>`;
	});

	const title = escapeHtml(i18n.t(titleKey) || defaultTitle);

	return `
        <div class="${UI_CLASSES.parentGroupSection}">
            <div class="${UI_CLASSES.parentGroupHeader}">
                <span class="${UI_CLASSES.parentHeaderLine}"></span>
                <span class="${UI_CLASSES.parentHeaderText}">${title}</span>
                <span class="${UI_CLASSES.parentHeaderLine}"></span>
            </div>
            <div class="${UI_CLASSES.parentGroupGrid}">
                ${tilesHTML}
            </div>
        </div>
    `;
}

/**
 * РІВЕНЬ UI: Головна функція рендеру блоку "Батьки"
 * Оптимізовано: безпечний доступ до властивостей та санітизація заголовка.
 */
export function renderParentsSection(person) {
	const parents = person?._family?.parents;
	if (!parents) return "";

	const ctx = person._context;

	const bioParents = Array.isArray(parents.bio) ? parents.bio : [];
	const stepParents = Array.isArray(parents.step) ? parents.step : [];
	const adoptedParents = Array.isArray(parents.adopted) ? parents.adopted : [];

	if (!bioParents.length && !stepParents.length && !adoptedParents.length) {
		return "";
	}

	let contentHTML = "";
	contentHTML += renderParentGroup(
		"kinship.bioParents",
		"РІДНІ",
		bioParents,
		ctx,
		"bio",
	);
	contentHTML += renderParentGroup(
		"kinship.adoptedParents",
		"ПРИЙОМНІ",
		adoptedParents,
		ctx,
		"adopted",
	);
	contentHTML += renderParentGroup(
		"kinship.stepParents",
		"ВІТЧИМ / МАЧУХА",
		stepParents,
		ctx,
		"step",
	);

	if (!contentHTML) return "";

	const sectionTitle = escapeHtml(i18n.t("profile.parents") || "Батьки");

	return `
    <section class="${UI_CLASSES.profileBlock}">
        <h2 class="${UI_CLASSES.profileBlockHeader}">${sectionTitle}</h2>
        <div class="${UI_CLASSES.profileBlockBody}">
            ${contentHTML}
        </div>
    </section>
    `;
}
