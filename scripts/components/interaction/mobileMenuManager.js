// ./scripts/components/interaction/mobileMenuManager.js

import { UI_CLASSES } from "../../core/uiClasses.js";

export class MobileMenuManager {
	constructor() {
		this.menuBtn = document.getElementById("mobile-menu-btn");
		this.secondaryPanel = document.getElementById("secondary-menu-panel");
		this.mainPanel = document.querySelector(".top-bar-controls");

		// Кешування динамічних вузлів O(1)
		this.icon = this.menuBtn ? this.menuBtn.querySelector("i") : null;

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
		if (!this.menuBtn) return;

		this.menuBtn.addEventListener("click", this._handleToggle);

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

		if (this.menuBtn) {
			this.menuBtn.setAttribute("aria-expanded", "true");
		}

		if (this.icon) {
			this.icon.className = "ri-close-line";
		}

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

		if (this.menuBtn) {
			this.menuBtn.setAttribute("aria-expanded", "false");
		}

		if (this.icon) {
			this.icon.className = "ri-menu-line";
		}

		// Негайне вивільнення ресурсів
		document.removeEventListener("click", this._handleGlobalClick);
		document.removeEventListener("keydown", this._handleEscape);
	}

	_handleToggle(e) {
		e.stopPropagation();
		this.toggle();
	}

	_handleGlobalClick(e) {
		if (
			this.isOpen &&
			!this.secondaryPanel?.contains(e.target) &&
			!this.menuBtn?.contains(e.target)
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
		if (this.isOpen && !this.menuBtn?.contains(e.target)) {
			this.close();
		}
	}

	_handleEscape(e) {
		if (e.key === "Escape" && this.isOpen) {
			this.close();
		}
	}

	destroy() {
		if (this.isOpen) this.close();

		if (this.menuBtn) {
			this.menuBtn.removeEventListener("click", this._handleToggle);
		}
		if (this.secondaryPanel) {
			this.secondaryPanel.removeEventListener("click", this._handlePanelClick);
		}
		if (this.mainPanel) {
			this.mainPanel.removeEventListener("click", this._handleMainPanelClick);
		}
	}
}
