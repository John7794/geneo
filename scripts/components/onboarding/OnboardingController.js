// ./scripts/components/onboarding/OnboardingController.js

import { HelpModal } from "./HelpModal.js";

/**
 * Контролер системи довідкової інформації.
 * Забезпечує зв'язок апаратної кнопки інтерфейсу зі статичним модальним вікном.
 */
export class OnboardingController {
	constructor(appContext) {
		if (window.__onboardingControllerInstance) {
			window.__onboardingControllerInstance.destroy();
		}
		window.__onboardingControllerInstance = this;

		this.appContext = appContext;
		this.helpModal = null;

		this._initHelpButton = this._initHelpButton.bind(this);

		this.init();
	}

	init() {
		this.helpModal = new HelpModal();
		this._initHelpButton();
	}

	_initHelpButton() {
		const existingBtn = document.getElementById("btn-help");
		if (!existingBtn) return;

		const newBtn = existingBtn.cloneNode(true);
		existingBtn.parentNode.replaceChild(newBtn, existingBtn);

		newBtn.addEventListener("click", (e) => {
			e.preventDefault();
			if (this.helpModal) {
				this.helpModal.open();
			}
		});
	}

	destroy() {
		if (this.helpModal) {
			this.helpModal.destroy();
			this.helpModal = null;
		}
	}
}
