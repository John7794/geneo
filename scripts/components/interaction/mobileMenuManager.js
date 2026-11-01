// ./scripts/components/interaction/mobileMenuManager.js

import { UI_CLASSES } from "../../core/uiClasses.js";

export class MobileMenuManager {
	constructor() {
		this.fabBtn = document.getElementById("mobile-menu-btn");
		this.dockBtn = document.getElementById("dock-menu-btn");
		this.secondaryPanel = document.getElementById("secondary-menu-panel");
		this.mobileMenuModal = document.getElementById("mobile-menu-modal");
		this.btnCloseMobileMenu = document.getElementById("btn-close-mobile-menu");

		this.isOpen = false;

		// Фіксація контексту для стабільного видалення подій
		this._handleFabClick = this._handleFabClick.bind(this);
		this._handleDockClick = this._handleDockClick.bind(this);
		this._handleGlobalClick = this._handleGlobalClick.bind(this);
		this._handlePanelClick = this._handlePanelClick.bind(this);
		this._handleMobileAction = this._handleMobileAction.bind(this);
		this._handleEscape = this._handleEscape.bind(this);
		this._checkPopups = this._checkPopups.bind(this);

		this.init();
	}

	init() {
		// FAB кнопка відкриває повноцінне модальне меню на смартфонах
		if (this.fabBtn) {
			this.fabBtn.addEventListener("click", this._handleFabClick);
		}

		// Десктопна кнопка у доку відкриває випадаючу панель
		if (this.dockBtn) {
			this.dockBtn.addEventListener("click", this._handleDockClick);
		}

		// Кнопка закриття мобільного меню
		if (this.btnCloseMobileMenu) {
			this.btnCloseMobileMenu.addEventListener("click", () => this.close());
		}

		// Клік по оверлею мобільного меню закриває його
		if (this.mobileMenuModal) {
			this.mobileMenuModal.addEventListener("click", (e) => {
				if (e.target === this.mobileMenuModal) {
					this.close();
				}
			});

			// Делегування дій у мобільному меню
			this.mobileMenuModal.addEventListener("click", this._handleMobileAction);
		}

		if (this.secondaryPanel) {
			this.secondaryPanel.addEventListener("click", this._handlePanelClick);
		}

		// MutationObserver: гарантує, що FAB прихований при будь-якому відкритому модальному вікні
		this._initPopupObserver();

		// Синхронізація бейджів та теми
		this._syncBadges();
		this._syncThemeInfo();
	}

	_initPopupObserver() {
		if (typeof MutationObserver === "undefined") return;

		this._observer = new MutationObserver(this._checkPopups);
		this._observer.observe(document.body, {
			attributes: true,
			attributeFilter: ["class"],
			subtree: true,
		});

		// Початкова перевірка
		this._checkPopups();
	}

	_checkPopups() {
		const appLoader = document.getElementById("app-loader");
		const isLoaderVisible = appLoader && !appLoader.classList.contains("hidden");

		const openPopups = document.querySelectorAll(
			".popup-overlay.show, .popup-overlay.open"
		);

		const shouldHideFab = isLoaderVisible || openPopups.length > 0;

		if (this.fabBtn) {
			if (shouldHideFab) {
				this.fabBtn.style.setProperty("display", "none", "important");
			} else {
				this.fabBtn.style.removeProperty("display");
			}
		}
	}

	_handleFabClick(e) {
		e.stopPropagation();
		this.open();
	}

	_handleDockClick(e) {
		e.stopPropagation();
		if (this.isOpen) {
			this.close();
		} else {
			this.open();
		}
	}

	open() {
		this.isOpen = true;

		if (this.mobileMenuModal) {
			this.mobileMenuModal.classList.remove("hidden");
			this.mobileMenuModal.classList.add("show");
			document.body.classList.add("no-scroll");
			if (this.fabBtn) {
				this.fabBtn.style.setProperty("display", "none", "important");
			}
		}

		this._syncBadges();
		this._syncThemeInfo();

		if (this.dockBtn) {
			this.dockBtn.setAttribute("aria-expanded", "true");
			const icon = this.dockBtn.querySelector("i");
			if (icon) icon.className = "ri-close-line";
		}

		document.addEventListener("click", this._handleGlobalClick);
		document.addEventListener("keydown", this._handleEscape);
	}

	close() {
		this.isOpen = false;

		if (this.mobileMenuModal) {
			this.mobileMenuModal.classList.remove("show");
			this.mobileMenuModal.classList.add("hidden");
			document.body.classList.remove("no-scroll");
		}

		if (this.dockBtn) {
			this.dockBtn.setAttribute("aria-expanded", "false");
			const icon = this.dockBtn.querySelector("i");
			if (icon) icon.className = "ri-menu-line";
		}

		document.removeEventListener("click", this._handleGlobalClick);
		document.removeEventListener("keydown", this._handleEscape);

		this._checkPopups();
	}

	_handleGlobalClick(e) {
		if (
			this.isOpen &&
			!this.secondaryPanel?.contains(e.target) &&
			!this.dockBtn?.contains(e.target) &&
			!this.mobileMenuModal?.contains(e.target) &&
			!this.fabBtn?.contains(e.target)
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

	_handleMobileAction(e) {
		const actionBtn = e.target.closest(".js-mobile-action");
		if (!actionBtn) return;

		e.preventDefault();
		const action = actionBtn.getAttribute("data-action");
		this.close();

		setTimeout(() => {
			this._triggerAction(action);
		}, 100);
	}

	_triggerAction(action) {
		switch (action) {
			case "home":
				document.getElementById("btn-home")?.click();
				break;
			case "search":
				document.getElementById("btn-search")?.click();
				break;
			case "lineage":
				document.getElementById("btn-lineage")?.click();
				break;
			case "account":
				(
					document.getElementById("btn-account-menu") ||
					document.getElementById("btn-user-account")
				)?.click();
				break;
			case "workspaces":
				document.getElementById("btn-workspaces")?.click();
				break;
			case "gedcom":
				document.getElementById("btn-gedcom")?.click();
				break;
			case "gdrive":
				document.getElementById("btn-gdrive")?.click();
				break;
			case "audit":
				document.getElementById("btn-tree-audit")?.click();
				break;
			case "ai":
				document.getElementById("btn-ai")?.click();
				break;
			case "analytics":
				document.getElementById("btn-analytics")?.click();
				break;
			case "events":
				document.getElementById("btn-events")?.click();
				break;
			case "lang":
			document.getElementById("btn-lang-toggle")?.click();
			break;
			case "theme":
				document.getElementById("theme-toggle")?.click();
				this._syncThemeInfo();
				break;
		}
	}

	_syncBadges() {
		const eventsBadge = document.getElementById("events-badge");
		const mobileEventsBadge = document.getElementById("mobile-menu-badge-events");
		if (mobileEventsBadge && eventsBadge) {
			const hasEvents = !eventsBadge.classList.contains("hidden");
			mobileEventsBadge.classList.toggle("hidden", !hasEvents);
		}

		const auditBadge =
			document.getElementById("audit-badge-secondary") ||
			document.getElementById("audit-tab-badge");
		const mobileAuditBadge = document.getElementById("mobile-menu-badge-audit");
		if (mobileAuditBadge && auditBadge) {
			const hasAudit = !auditBadge.classList.contains("hidden");
			mobileAuditBadge.classList.toggle("hidden", !hasAudit);
		}
	}

	_syncThemeInfo() {
		const isDark = document.documentElement.classList.contains("theme-dark");
		const themeIcon = document.getElementById("mobile-theme-icon");
		const themeText = document.getElementById("mobile-theme-text");

		if (themeIcon) {
			themeIcon.className = isDark ? "ri-sun-line" : "ri-moon-line";
		}
		if (themeText) {
			themeText.textContent = isDark ? "Темна тема (увімкнено)" : "Світла тема (увімкнено)";
		}
	}

	_handleEscape(e) {
		if (e.key === "Escape" && this.isOpen) {
			this.close();
		}
	}

	destroy() {
		if (this.isOpen) this.close();
		if (this._observer) this._observer.disconnect();

		if (this.fabBtn) {
			this.fabBtn.removeEventListener("click", this._handleFabClick);
		}
		if (this.dockBtn) {
			this.dockBtn.removeEventListener("click", this._handleDockClick);
		}
		if (this.secondaryPanel) {
			this.secondaryPanel.removeEventListener("click", this._handlePanelClick);
		}
	}
}
