// ./scripts/components/interaction/mobileMenuManager.js

import { UI_CLASSES } from "../../core/uiClasses.js";

export class MobileMenuManager {
	constructor() {
		this.menuBtn = document.getElementById("mobile-menu-btn");
		this.sidePanel = document.querySelector(".top-bar-controls");

		// Кешування динамічних вузлів O(1)
		this.icon = this.menuBtn ? this.menuBtn.querySelector("i") : null;

		this.isOpen = false;

		// Фіксація контексту для стабільного видалення подій
		this._handleToggle = this._handleToggle.bind(this);
		this._handleGlobalClick = this._handleGlobalClick.bind(this);
		this._handlePanelClick = this._handlePanelClick.bind(this);
		this._handleEscape = this._handleEscape.bind(this);

		this.init();
	}

	init() {
		if (!this.menuBtn || !this.sidePanel) return;

		this.menuBtn.addEventListener("click", this._handleToggle);
		this.sidePanel.addEventListener("click", this._handlePanelClick);
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
		this.sidePanel.classList.add("is-open");
		this.menuBtn.setAttribute("aria-expanded", "true");

		if (this.icon) {
			this.icon.className = "ri-close-line";
		}

		// Динамічний монтаж глобальних подій лише на період активності
		document.addEventListener("click", this._handleGlobalClick);
		document.addEventListener("keydown", this._handleEscape);
	}

	close() {
		this.isOpen = false;
		this.sidePanel.classList.remove("is-open");
		this.menuBtn.setAttribute("aria-expanded", "false");

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
			!this.sidePanel.contains(e.target) &&
			!this.menuBtn.contains(e.target)
		) {
			this.close();
		}
	}

	_handlePanelClick(e) {
		const toolBtn = e.target.closest(".tool-btn, button");
		if (toolBtn) {
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
		if (this.sidePanel) {
			this.sidePanel.removeEventListener("click", this._handlePanelClick);
		}
	}
}
