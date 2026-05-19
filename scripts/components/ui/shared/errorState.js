// ./scripts/components/ui/shared/errorState.js

import { UI_CLASSES } from "../../../core/uiClasses.js";
import { i18n } from "../../../core/i18n.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * Генерує HTML-заглушку для критичних станів відображення профілю.
 * Оптимізовано: вилучено інлайн-стилі, інлайн-скрипти (JS anti-pattern) та додано санітизацію.
 */
export function renderErrorState() {
	const getStr = (key, fallback) => {
		const val = i18n.t ? i18n.t(key) : null;
		const rawStr = val && val !== key ? val : fallback;
		return escapeHtml(rawStr);
	};

	const message = getStr(
		"error.profileUnavailable",
		"За вказаним ідентифікатором запис не знайдено, обірвано генеалогічний зв'язок, або особа є непрямим родичем чи знайомим.",
	);

	const title = getStr("ui.errorOops", "Ой!");
	const btnText = getStr("ui.returnToMain", "Повернутися на головну");

	// Інлайн-обробник onclick замінено на data-атрибут.
	// Глобальний роутер має перехоплювати кліки по [data-action="return-home"].
	return `
        <div class="error-state-wrapper">
            <div class="error-state-icon">
                <i class="ri-user-unfollow-line" aria-hidden="true"></i>
            </div>
            
            <h2 class="${UI_CLASSES.fwBold}">${title}</h2>
            
            <p class="${UI_CLASSES.textMuted} error-state-message">
                ${message}
            </p>
            
            <button class="${UI_CLASSES.btn} ${UI_CLASSES.btnPrimary} error-state-btn" data-action="return-home">
                <i class="ri-home-4-line"></i> ${btnText}
            </button>
        </div>
    `;
}
