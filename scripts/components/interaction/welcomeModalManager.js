// ./scripts/components/interaction/welcomeModalManager.js

/**
 * Вітальний екран та перший запуск (First-Run Onboarding)
 */
export class WelcomeModalManager {
	constructor(gedcomManager, accountModalManager, archiveImportManager = null) {
		this.gedcomManager = gedcomManager;
		this.accountModalManager = accountModalManager;
		this.archiveImportManager = archiveImportManager;
		this.modal = document.getElementById("welcome-modal");
		this._storageKey = "geneo_welcome_dismissed_v1";

		this._initEvents();
	}

	_initEvents() {
		if (!this.modal) return;

		const btnImportGedcom = this.modal.querySelector("#btn-welcome-gedcom");
		const btnConnectGdrive = this.modal.querySelector("#btn-welcome-gdrive");
		const btnImportZip = this.modal.querySelector("#btn-welcome-zip");
		const btnExploreDemo = this.modal.querySelector("#btn-welcome-demo");
		const btnLogin = this.modal.querySelector("#btn-welcome-login");
		const btnClose = this.modal.querySelector("#btn-close-welcome");
		const checkboxDontShow = this.modal.querySelector("#checkbox-welcome-dont-show");

		if (btnConnectGdrive) {
			btnConnectGdrive.addEventListener("click", () => {
				this._saveDismissState(checkboxDontShow?.checked);
				this.close();
				const gdriveBtn = document.getElementById("btn-gdrive") || document.querySelector(".js-open-gdrive");
				if (gdriveBtn) gdriveBtn.click();
			});
		}

		if (btnImportGedcom) {
			btnImportGedcom.addEventListener("click", () => {
				this._saveDismissState(checkboxDontShow?.checked);
				this.close();
				if (this.gedcomManager) {
					this.gedcomManager.openModal();
				}
			});
		}

		if (btnImportZip) {
			btnImportZip.addEventListener("click", () => {
				this._saveDismissState(checkboxDontShow?.checked);
				this.close();
				const zipInput = document.getElementById("input-empty-archive");
				if (zipInput) {
					zipInput.click();
				}
			});
		}

		if (btnExploreDemo) {
			btnExploreDemo.addEventListener("click", () => {
				this._saveDismissState(checkboxDontShow?.checked);
				this.close();
			});
		}

		if (btnLogin) {
			btnLogin.addEventListener("click", () => {
				this._saveDismissState(checkboxDontShow?.checked);
				this.close();
				if (this.accountModalManager) {
					this.accountModalManager.open();
				}
			});
		}

		if (btnClose) {
			btnClose.addEventListener("click", () => {
				this._saveDismissState(checkboxDontShow?.checked);
				this.close();
			});
		}

		this.modal.addEventListener("click", (e) => {
			if (e.target === this.modal) {
				this._saveDismissState(checkboxDontShow?.checked);
				this.close();
			}
		});
	}

	checkFirstRun() {
		try {
			const dismissed = localStorage.getItem(this._storageKey);
			// Перевіряємо також, чи це новий сеанс гостя
			const urlParams = new URLSearchParams(window.location.search);
			if (urlParams.get("guest") === "true") {
				return;
			}
			if (!dismissed) {
				// Затримка 600мс для плавного завершення ініціалізації дерева
				setTimeout(() => this.open(), 600);
			}
		} catch (e) {}
	}

	open() {
		if (this.modal) {
			this.modal.classList.remove("hidden");
			this.modal.classList.add("show");
		}
	}

	close() {
		if (this.modal) {
			this.modal.classList.remove("show");
			this.modal.classList.add("hidden");
		}
	}

	_saveDismissState(dontShowAgain) {
		if (dontShowAgain) {
			try {
				localStorage.setItem(this._storageKey, "true");
			} catch (e) {}
		}
	}
}
