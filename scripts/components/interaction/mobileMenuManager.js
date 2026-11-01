// ./scripts/components/interaction/mobileMenuManager.js

import { UI_CLASSES } from "../../core/uiClasses.js";

export class MobileMenuManager {
	constructor() {
		this.fabBtn = document.getElementById("mobile-menu-btn");
		this.dockBtn = document.getElementById("dock-menu-btn");
		this.secondaryPanel = document.getElementById("secondary-menu-panel");
		this.mainPanel = document.querySelector(".top-bar-controls");

		this.isOpen = false;

		// Фіксація контексту для стабільного видалення подій
		this._handleToggle = this._handleToggle.bind(this);
		this._handleGlobalClick = this._handleGlobalClick.bind(this);
		this._handlePanelClick = this._handlePanelClick.bind(this);
		this._handleMainPanelClick = this._handleMainPanelClick.bind(this);
		this._handleEscape = this._handleEscape.bind(this);

		this.init();
	}

	init() {
		if (this.fabBtn) {
			this.fabBtn.addEventListener("click", this._handleToggle);
		}
		if (this.dockBtn) {
			this.dockBtn.addEventListener("click", this._handleToggle);
		}

		if (this.secondaryPanel) {
			this.secondaryPanel.addEventListener("click", this._handlePanelClick);
		}

		if (this.mainPanel) {
			this.mainPanel.addEventListener("click", this._handleMainPanelClick);
		}
	}

	toggle() {
		if (this.isOpen) {
			this.close();
		} else {
			this.open();
		}
	}

	open() {
		this.isOpen = true;
		if (this.secondaryPanel) {
			this.secondaryPanel.classList.add("is-open");
		}
		if (window.matchMedia("(max-width: 767px)").matches && this.mainPanel) {
			this.mainPanel.classList.add("is-open");
		}

		this._updateButtons(true);

		// Динамічний монтаж глобальних подій лише на період активності
		document.addEventListener("click", this._handleGlobalClick);
		document.addEventListener("keydown", this._handleEscape);
	}

	close() {
		this.isOpen = false;
		if (this.secondaryPanel) {
			this.secondaryPanel.classList.remove("is-open");
		}
		if (this.mainPanel) {
			this.mainPanel.classList.remove("is-open");
		}

		this._updateButtons(false);

		// Негайне вивільнення ресурсів
		document.removeEventListener("click", this._handleGlobalClick);
		document.removeEventListener("keydown", this._handleEscape);
	}

	_updateButtons(isOpen) {
		const btns = [this.fabBtn, this.dockBtn].filter(Boolean);
		btns.forEach((btn) => {
			btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
			const icon = btn.querySelector("i");
			if (icon) {
				icon.className = isOpen ? "ri-close-line" : "ri-menu-line";
			}
		});
	}

	_handleToggle(e) {
		e.stopPropagation();
		this.toggle();
	}

	_handleGlobalClick(e) {
		const isClickInsideFab = this.fabBtn?.contains(e.target);
		const isClickInsideDockBtn = this.dockBtn?.contains(e.target);
		const isClickInsideSecondary = this.secondaryPanel?.contains(e.target);
		const isClickInsideMain = this.mainPanel?.contains(e.target);

		if (
			this.isOpen &&
			!isClickInsideFab &&
			!isClickInsideDockBtn &&
			!isClickInsideSecondary &&
			(!window.matchMedia("(max-width: 767px)").matches || !isClickInsideMain)
		) {
			this.close();
		}
	}

	_handlePanelClick(e) {
		if (e.target.closest(".lang-menu-wrapper")) return;
		const toolBtn = e.target.closest(".tool-btn, button");
		if (toolBtn) {
			this.close();
		}
	}

	_handleMainPanelClick(e) {
		if (window.matchMedia("(max-width: 767px)").matches && this.isOpen) {
			const toolBtn = e.target.closest("button");
			if (toolBtn && toolBtn !== this.dockBtn) {
				this.close();
			}
		}
	}

	_handleEscape(e) {
		if (e.key === "Escape" && this.isOpen) {
			this.close();
		}
	}

	destroy() {
		if (this.isOpen) this.close();

		if (this.fabBtn) {
			this.fabBtn.removeEventListener("click", this._handleToggle);
		}
		if (this.dockBtn) {
			this.dockBtn.removeEventListener("click", this._handleToggle);
		}
		if (this.secondaryPanel) {
			this.secondaryPanel.removeEventListener("click", this._handlePanelClick);
		}
		if (this.mainPanel) {
			this.mainPanel.removeEventListener("click", this._handleMainPanelClick);
		}
	}
}
