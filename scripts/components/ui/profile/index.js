// ./scripts/components/ui/profile/index.js

import { renderBasicBlock } from "./basic.js";
import { renderKinshipBlock } from "./kinship.js";
import { renderNamesBlock } from "./names.js";
import { renderBirthBlock } from "./birth.js";
import { renderBaptismBlock } from "./baptism.js";
import { renderMarriageBlock } from "./marriage.js";
import { renderDeathBlock } from "./death.js";
import { renderFuneralBlock } from "./funeral.js";
import { renderParentsSection } from "./parents.js";
import { renderGrandparentsSection } from "./grandparents.js";
import { renderChildrenSection } from "./children.js";
import { renderGrandchildrenSection } from "./grandchildren.js";
import { renderSiblingsSection } from "./siblings.js";
import { renderRelativesSection } from "./relatives.js";
import { renderRecords } from "./records.js";
import { renderEducationBlock } from "./education.js";
import { renderJobBlock } from "./job.js";
import { renderAwardsBlock } from "./awards.js";
import { renderMilitaryBlock } from "./military.js";

// Імпортуємо розширені блоки
import { renderIdentityBlock } from "./identity.js";
import { renderDomicileBlock } from "./domicile.js";
import { renderPersonalBlock } from "./personal.js";
import { renderGalleryBlock } from "./gallery.js";
import { renderSpiritualSection } from "./spiritualKinship.js";

import { renderErrorState } from "../shared/errorState.js";
import { StickyHeaderManager } from "../../interaction/stickyHeaderManager.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";

/**
 * Список рендер-функцій у порядку їх відображення на сторінці.
 * Порядок генерує сторітелінг профілю.
 */
const SECTION_RENDERERS = [
	renderKinshipBlock, // 1. Спорідненість
	renderNamesBlock, // 2. Імена
	renderIdentityBlock, // 3. Ідентичність та статус (Хто ця людина в суспільстві)
	renderBirthBlock, // 4. Народження
	renderBaptismBlock, // 5. Хрещення
	renderMarriageBlock, // 6. Шлюби
	renderChildrenSection, // 7. Діти
	renderGrandchildrenSection, // 8. Онуки
	renderSiblingsSection, // 9. Брати/Сестри
	renderRelativesSection, // 10. Інші родичі
	renderSpiritualSection, // 11. Духовне споріднення (Куми / Похресники)
	renderDeathBlock, // 12. Смерть
	renderFuneralBlock, // 13. Поховання
	renderRecords, // 14. Документи
	renderDomicileBlock, // 15. Місця проживання (Географія переміщень)
	renderEducationBlock, // 16. Освіта
	renderJobBlock, // 17. Професійна діяльність
	renderAwardsBlock, // 18. Нагороди та відзнаки
	renderMilitaryBlock, // 19. Військова служба
	renderPersonalBlock, // 20. Особистий портрет (Хобі, характер, зовнішність)
	renderGalleryBlock, // 21. Фотогалерея (Візуальний підсумок)
	renderParentsSection, // 22. Батьки (футер)
	renderGrandparentsSection, // 23. Діди (футер)
];

let activeStickyHeader = null;

/**
 * Головний Контролер UI Профілю.
 * Оптимізовано: усунуто дебаг, синхронізовано DOM-ініціалізацію з циклом відмальовки.
 */
export function renderProfile(person) {
	const container = document.getElementById("profile-content");
	if (!container) return;

	if (activeStickyHeader) {
		activeStickyHeader.destroy();
		activeStickyHeader = null;
	}

	window.scrollTo(0, 0);
	container.innerHTML = "";

	if (!person || person._isMissing) {
		container.innerHTML = renderErrorState();
		return;
	}

	const headerHTML = renderBasicBlock(person) || "";

	const bodyHTML = SECTION_RENDERERS.map((renderFn) => renderFn(person))
		.filter(Boolean)
		.join("");

	const bodyContainerClass =
		UI_CLASSES.profileBodyBlocks || "profile-body-blocks";

	container.innerHTML = `
        ${headerHTML}
        <div class="${bodyContainerClass}">
            ${bodyHTML}
        </div>
    `;

	// Синхронізація ініціалізації скриптів з DOM за допомогою мікрозадач
	queueMicrotask(() => {
		requestAnimationFrame(() => {
			activeStickyHeader = new StickyHeaderManager();
		});
	});
}
