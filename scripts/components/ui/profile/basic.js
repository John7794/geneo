// ./scripts/components/ui/profile/basic.js

import { APP_CONFIG } from "../../../core/appConfig.js";
import { i18n } from "../../../core/i18n.js";
import { getFullName, getAvatarUrl, resolveStatus, parseConfirmations } from "../../../utils/personUtils.js";
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

	const pName = person.name || person.first_name || "";
	const pSurname = person.surname || person.last_name || "";
	const rawPhotoSrc = getAvatarUrl(person.photo, female, pName, pSurname);
	const safePhotoSrc = rawPhotoSrc.startsWith("data:") ? rawPhotoSrc : encodeURI(rawPhotoSrc);
	const defaultAvatar = getAvatarUrl(null, female, pName, pSurname);

	// 🔥 Комбінований статус: 3 рівні підтвердження. Пробанд (ID 1) та порожні комірки = підтверджено за замовчуванням
	const isProband1 = String(person.id).trim() === "1" || person.isRoot;
	const rawSources = person.sources || person.confirmations || person._basic?.sources || person._basic?.confirmations || person.grounds || person._basic?.grounds || "";
	const resolvedStatus = resolveStatus(person.status, rawSources, isProband1);

	const isConfirmed = isProband1 || resolvedStatus === "confirmed";
	const isIndirect = !isConfirmed && resolvedStatus === "indirect";
	const isHypothetical = !isConfirmed && !isIndirect;

	let statusTextRaw = "";
	let modifierClass = "";
	let iconClass = "";

	const getSafeTranslation = (key, fallback) => {
		const val = i18n.t(key);
		return (val && val !== key) ? val : fallback;
	};

	if (isProband1) {
		statusTextRaw = "Вихідна особа (Пробанд)";
		modifierClass = UI_CLASSES.statusModifiers?.[1] || "status-badge--confirmed";
		iconClass = "ri-shield-check-line";
	} else if (isConfirmed) {
		statusTextRaw = getSafeTranslation("taxonomy.statusConfirmed", "Підтверджений зв'язок");
		modifierClass = UI_CLASSES.statusModifiers?.[1] || "status-badge--confirmed";
		iconClass = "ri-shield-check-line";
	} else if (isIndirect) {
		statusTextRaw = getSafeTranslation("taxonomy.statusIndirect", "Опосередкований зв'язок");
		modifierClass = UI_CLASSES.statusModifiers?.[2] || "status-badge--indirect";
		iconClass = "ri-link";
	} else {
		statusTextRaw = getSafeTranslation("taxonomy.statusHypothetical", "Гіпотетичний зв'язок");
		modifierClass = UI_CLASSES.statusModifiers?.[0] || "status-badge--hypothetical";
		iconClass = "ri-question-line";
	}

	const safeStatusText = escapeHtml(statusTextRaw);

	// Формуємо перелік документальних підтверджень із колонки confirmations / sources
	const confList = (person.confirmationsList && person.confirmationsList.length > 0)
		? person.confirmationsList
		: parseConfirmations(rawSources);
	let confTooltip = safeStatusText;
	if (confList.length > 0) {
		confTooltip += `: ${confList.join(', ')}`;
	}

	const statusHtml = `
		<div class="profile-status-pill ${modifierClass} has-dark-tooltip" title="${escapeHtml(confTooltip)}" tabindex="0">
			<span class="status-text">${safeStatusText}</span>
			<i class="${iconClass} status-icon" aria-hidden="true" style="display: none; font-size: 16px; line-height: 1;"></i>

			<!-- Темна glassmorphism-плашка для статусу в шапці профілю -->
			<div class="profile-status-dark-tooltip">
				<div class="dark-tooltip-header">
					<i class="ri-shield-check-line"></i>
					<span>${safeStatusText}</span>
				</div>
				<div class="dark-tooltip-body">
					${confList.length > 0 ? `
						<ul class="dark-tooltip-list">
							${confList.map(c => `<li><span class="conf-bullet">•</span> <span>${escapeHtml(c)}</span></li>`).join("")}
						</ul>
					` : `
						<div class="dark-tooltip-empty">${isProband1 ? "Базова особа родоводу (Пробанд)" : (isIndirect ? "Побічні свідчення / реконструкція" : (isConfirmed ? "Підтверджений родинний зв'язок" : "Без внесених першоджерел"))}</div>
					`}
				</div>
			</div>
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
                     referrerpolicy="no-referrer"
                     onerror="this.onerror=null; this.src='${escapeHtml(defaultAvatar)}';">
                
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
