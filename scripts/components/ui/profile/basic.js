// ./scripts/components/ui/profile/basic.js

import { APP_CONFIG } from "../../../core/appConfig.js";
import { i18n } from "../../../core/i18n.js";
import { getFullName, getAvatarUrl } from "../../../utils/personUtils.js";
import { isFemale } from "../../../utils/genderUtils.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";
import { escapeHtml } from "../../../utils/helpers.js";

export function renderBasicBlock(person) {
	if (!person || person._isMissing) return "";

	const safeId = escapeHtml(String(person.id));
	const encodedId = encodeURIComponent(String(person.id));

	const rawFullName = getFullName(person) || person.name || "";
	const safeFullName = escapeHtml(rawFullName);

	const female = isFemale(person.gender);
	const themeClass = female ? UI_CLASSES.themeFemale : UI_CLASSES.themeMale;

	const rawPhotoSrc = getAvatarUrl(person.photo, female);
	const safePhotoSrc = encodeURI(rawPhotoSrc);
	const defaultAvatar = encodeURI(
		female ? APP_CONFIG.defaultFemale : APP_CONFIG.defaultMale,
	);

	// 🔥 Комбінований статус: генеруємо І ТЕКСТ, І ІКОНКУ
	const rawStatus = String(person.status || "")
		.trim()
		.toLowerCase();
	const isConfirmed =
		rawStatus === "1" ||
		rawStatus === "confirmed" ||
		rawStatus === "true" ||
		rawStatus === "так" ||
		rawStatus === "+";

	let statusTextRaw = "";
	let modifierClass = "";
	let iconClass = "";

	if (isConfirmed) {
		statusTextRaw =
			i18n.t("taxonomy.statusConfirmed") || "Підтверджений зв'язок";
		modifierClass =
			UI_CLASSES.statusModifiers?.[1] || "status-badge--confirmed";
		iconClass = "ri-shield-check-line";
	} else {
		statusTextRaw =
			i18n.t("taxonomy.statusHypothetical") || "Гіпотетичний зв'язок";
		modifierClass =
			UI_CLASSES.statusModifiers?.[0] || "status-badge--hypothetical";
		iconClass = "ri-question-line";
	}

	const safeStatusText = escapeHtml(statusTextRaw);

	// Додаємо обидва елементи. Відображенням керуватиме CSS.
	const statusHtml = `
		<div class="profile-status-pill ${modifierClass}" title="${safeStatusText}">
			<span class="status-text">${safeStatusText}</span>
			<i class="${iconClass} status-icon" aria-hidden="true" style="display: none; font-size: 16px; line-height: 1;"></i>
		</div>`;

	const idLabel = escapeHtml(i18n.t("common.id") || "ID");
	const treeButtonLabel = escapeHtml(
		i18n.t("kinship.treeMode") || "Дерево роду",
	);
	const treeIconClass = UI_CLASSES.icons?.tree || "ri-git-branch-line";

	const treeUrl = `?id=${encodedId}&view=tree`;

	const idChipClass = UI_CLASSES.profileIdChip || "profile-id-chip";
	const btnClass = UI_CLASSES.btn || "btn";
	const btnOpenTreeClass = UI_CLASSES.btnOpenTree || "btn-open-tree";
	const btnTextClass = UI_CLASSES.btnText || "btn-text";
	const avatarClass = UI_CLASSES.profileAvatar || "profile-avatar";

	return `
    <div class="${UI_CLASSES.profileHeaderPlaceholder || "profile-header-placeholder"}"></div>

    <header class="${UI_CLASSES.profileHeader || "profile-header"} ${themeClass}" id="sticky-header">
        
        <div class="${UI_CLASSES.profileCover || "profile-cover"}">
            <span class="${idChipClass} id-expanded">${idLabel}: ${safeId}</span>
        </div>
        
        <div class="${UI_CLASSES.profileHeaderContent || "profile-header-content"}">
            
            <div class="profile-header-main">
                <img src="${safePhotoSrc}" 
                     class="${avatarClass} profile-avatar-main" 
                     alt="${safeFullName}" 
                     loading="eager"
                     onerror="this.onerror=null; this.src='${defaultAvatar}';">
                
                <div class="profile-info-center">
                    <h1 class="${UI_CLASSES.profileName || "profile-name"}">${safeFullName}</h1>
                    ${statusHtml}
                </div>

                <a href="${treeUrl}" class="${btnClass} btn-tree btn-expanded ${btnOpenTreeClass}" data-id="${safeId}" title="${treeButtonLabel}">
                    <i class="${treeIconClass}" aria-hidden="true"></i>
                    <span class="${btnTextClass}">${treeButtonLabel}</span>
                </a>
            </div>

            <div class="profile-header-right">
                <span class="${idChipClass} id-collapsed">${idLabel}: ${safeId}</span>
                <a href="${treeUrl}" class="${btnClass} btn-tree btn-collapsed ${btnOpenTreeClass}" data-id="${safeId}" title="${treeButtonLabel}">
                    <i class="${treeIconClass}" aria-hidden="true"></i>
                </a>
            </div>

        </div>
    </header>
    `;
}
