// ./scripts/components/ui/shared/personTile.js

import { APP_CONFIG } from "../../../core/appConfig.js";
import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";
import { isFemale } from "../../../utils/genderUtils.js";
import { getAvatarUrl, getProfileUrl } from "../../../utils/personUtils.js";
import { formatPersonNameHtml } from "../formatters/name.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * РІВЕНЬ UI: Головна функція рендеру плитки персони (Molecule)
 * Оптимізовано: санітизація, вилучення інлайн-скриптів.
 */
export function renderPersonTile(
	person,
	ctx,
	roleLabelRaw = "",
	isPlaceholder = false,
	options = {},
) {
	const unknownLabelRaw = i18n.t("common.unknown") || "Невідомо";
	const unknownLabel = escapeHtml(unknownLabelRaw);
	const roleLabel = escapeHtml(roleLabelRaw);

	// 1. Рендер заглушки
	if (isPlaceholder || !person) {
		return `
        <div class="${UI_CLASSES.kinshipCard} ${UI_CLASSES.kinshipCardPlaceholder}">
            <div class="${UI_CLASSES.kinshipCardMedia}">
                <div class="${UI_CLASSES.avatarPlaceholder}">?</div>
            </div>
            <div class="${UI_CLASSES.kinshipCardInfo}">
                <div class="${UI_CLASSES.kinshipCardRoleLabel}" title="${roleLabel}">${roleLabel}</div>
                <div class="${UI_CLASSES.kinshipCardName}">${unknownLabel}</div>
            </div>
        </div>`;
	}

	// 2. Підготовка даних
	const nameHtml = formatPersonNameHtml(person, options);
	const isFem = isFemale(person.gender);

	const rawPhotoSrc = getAvatarUrl(person.photo || person.rawPhoto, isFem);
	const photoSrc = encodeURI(rawPhotoSrc);

	const rawFallbackSrc = isFem
		? APP_CONFIG.defaultFemale
		: APP_CONFIG.defaultMale;
	const fallbackSrc = encodeURI(rawFallbackSrc);

	const safeId = escapeHtml(String(person.id || ""));
	const altText = escapeHtml(person.name || unknownLabelRaw);

	// 3. Генерація кнопки дії (Перехід до профілю)
	let actionBtnHtml = "";
	if (person.hasProfile && safeId) {
		const viewLabelRaw = i18n.t("ui.viewProfile") || "Перейти до профілю";
		const viewLabel = escapeHtml(viewLabelRaw);

		let profileUrlRaw = "";
		if (typeof getProfileUrl === "function") {
			profileUrlRaw = getProfileUrl(person.id, { ...ctx, view: "profile" });
		} else {
			profileUrlRaw = `?id=${safeId}&view=profile`;
		}

		if (!profileUrlRaw.includes("view=profile")) {
			profileUrlRaw += profileUrlRaw.includes("?")
				? "&view=profile"
				: "?view=profile";
		}

		const profileUrl = encodeURI(profileUrlRaw);
		const searchIcon = escapeHtml(
			UI_CLASSES.icons?.userSearch || "ri-user-search-line",
		);

		// Клас 'js-stop-prop' додано для перехоплення глобальним роутером (замість onclick)
		actionBtnHtml = `
            <a href="${profileUrl}" 
               class="${UI_CLASSES.kinshipCardActions} js-stop-prop" 
               title="${viewLabel}">
                <i class="${searchIcon}" aria-hidden="true"></i>
            </a>
        `;
	}

	const popupClass =
		safeId && !options.disablePopup ? UI_CLASSES.jsOpenPersonPopup : "";
	const sourceSafe = escapeHtml(person.source || "familyList");
	const dataAttrs = safeId
		? `data-id="${safeId}" data-source="${sourceSafe}"`
		: "";

	// 4. Фінальна збірка
	return `
    <div class="${UI_CLASSES.kinshipCard} ${UI_CLASSES.kinshipCardPerson} ${popupClass}" 
         ${dataAttrs} role="button" tabindex="0">
        
        <div class="${UI_CLASSES.kinshipCardMedia}">
            <img src="${photoSrc}" 
                 alt="${altText}" 
                 loading="lazy" 
                 class="${UI_CLASSES.kinshipCardImg}"
                 onerror="this.onerror=null; this.src='${fallbackSrc}';">
        </div>
        
        <div class="${UI_CLASSES.kinshipCardInfo}">
            <div class="${UI_CLASSES.kinshipCardRoleLabel}" title="${roleLabel}">${roleLabel}</div>
            <div class="${UI_CLASSES.kinshipCardName}">${nameHtml}</div>
        </div>

        ${actionBtnHtml}
    </div>`;
}
