// ./scripts/components/interaction/langManager.js

import { UI_CLASSES } from "../../core/uiClasses.js";

export class LangManager {
	constructor() {
		this.btnToggle = document.getElementById("btn-lang-toggle");
		this.menu = document.getElementById("lang-menu");
		this.modal = document.getElementById("lang-modal");
		this.btnCloseModal = document.getElementById("btn-close-lang-modal");

		this.isOpen = false;
		this.menuParent = null;

		// Жорстка фіксація контексту
		this.toggleMenu = this.toggleMenu.bind(this);
		this.closeMenu = this.closeMenu.bind(this);
		this.openModal = this.openModal.bind(this);
		this.closeModal = this.closeModal.bind(this);
		this._handleOutsideClick = this._handleOutsideClick.bind(this);
		this._handleEscape = this._handleEscape.bind(this);
		this._handleMenuClick = this._handleMenuClick.bind(this);
		this._handleToggleClick = this._handleToggleClick.bind(this);
		this._handleModalClick = this._handleModalClick.bind(this);

		this.init();
	}

	init() {
		if (this.menu) {
			this.menuParent = this.menu.parentElement;
			this.menu.addEventListener("click", this._handleMenuClick);
		}

		this._renderActiveLanguage();

		if (this.btnToggle) {
			this.btnToggle.addEventListener("click", this._handleToggleClick);
		}

		if (this.modal) {
			this.modal.addEventListener("click", this._handleModalClick);
		}

		if (this.btnCloseModal) {
			this.btnCloseModal.addEventListener("click", () => this.closeModal());
		}
	}

	_handleToggleClick(e) {
		e.stopPropagation();
		this.openModal();
	}

	_handleModalClick(e) {
		const choiceBtn = e.target.closest(".js-lang-choice, [data-lang]");
		if (choiceBtn) {
			const lang = choiceBtn.getAttribute("data-lang");
			if (lang) {
				this.changeLanguage(lang);
				return;
			}
		}

		// Клік поза вікном (по темному оверлею) закриває попап
		if (e.target === this.modal) {
			this.closeModal();
		}
	}

	_handleMenuClick(e) {
		const btn = e.target.closest("[data-lang]");
		if (btn) {
			const lang = btn.getAttribute("data-lang");
			if (lang) this.changeLanguage(lang);
		}
	}

	_renderActiveLanguage() {
		const rawLang = localStorage.getItem("appLang") || "uk";

		const displayMap = {
			uk: "UA",
			en: "EN",
		};

		const activeCode = displayMap[rawLang] || rawLang.toUpperCase();
		if (this.btnToggle) {
			this.btnToggle.innerHTML = `<span class="lang-code-text">${activeCode}</span>`;
		}

		const mobileLangDesc = document.querySelector('[data-action="lang"] .mobile-nav-desc') || document.getElementById("mobile-menu-lang-desc");
		if (mobileLangDesc) {
			mobileLangDesc.textContent = rawLang === "en" ? "English (активна)" : "Українська (активна)";
		}

		if (this.modal) {
			const cards = this.modal.querySelectorAll(".js-lang-choice");
			cards.forEach(card => {
				if (card.getAttribute("data-lang") === rawLang) {
					card.classList.add("is-active");
				} else {
					card.classList.remove("is-active");
				}
			});
		}
	}

	openModal() {
		if (!this.modal) this.modal = document.getElementById("lang-modal");
		if (!this.modal) {
			this.toggleMenu();
			return;
		}

		this.isOpen = true;
		this._renderActiveLanguage();

		this.modal.classList.remove(UI_CLASSES.hidden || "hidden");
		this.modal.setAttribute("aria-hidden", "false");
		document.body.classList.add(UI_CLASSES.noScroll || "no-scroll");

		requestAnimationFrame(() => {
			this.modal.classList.add("show");
		});

		document.addEventListener("keydown", this._handleEscape);
	}

	closeModal() {
		if (!this.modal) return;
		this.isOpen = false;

		this.modal.classList.remove("show");
		document.body.classList.remove(UI_CLASSES.noScroll || "no-scroll");
		document.removeEventListener("keydown", this._handleEscape);

		setTimeout(() => {
			if (!this.isOpen && this.modal) {
				this.modal.classList.add(UI_CLASSES.hidden || "hidden");
				this.modal.setAttribute("aria-hidden", "true");
			}
		}, 150);
	}

	toggleMenu() {
		if (this.modal) {
			if (this.isOpen) {
				this.closeModal();
			} else {
				this.openModal();
			}
			return;
		}

		if (this.isOpen) {
			this.closeMenu();
		} else {
			this.isOpen = true;
			if (this.menu) {
				document.body.appendChild(this.menu);
				this.menu.classList.remove(UI_CLASSES.hidden || "hidden");
				document.body.classList.add(UI_CLASSES.noScroll || "no-scroll");
				requestAnimationFrame(() => {
					this.menu.classList.add("show");
				});
				document.addEventListener("click", this._handleOutsideClick);
				document.addEventListener("keydown", this._handleEscape);
			}
		}
	}

	closeMenu() {
		if (this.modal) {
			this.closeModal();
			return;
		}
		if (!this.isOpen) return;
		this.isOpen = false;

		if (this.menu) {
			this.menu.classList.remove("show");
			document.body.classList.remove(UI_CLASSES.noScroll || "no-scroll");
			document.removeEventListener("click", this._handleOutsideClick);
			document.removeEventListener("keydown", this._handleEscape);

			setTimeout(() => {
				if (!this.isOpen && this.menu) {
					this.menu.classList.add(UI_CLASSES.hidden || "hidden");
					if (this.menuParent && this.menu.parentElement !== this.menuParent) {
						this.menuParent.appendChild(this.menu);
					}
				}
			}, 150);
		}
	}

	_handleOutsideClick(e) {
		if (!this.isOpen) return;
		if (this.modal) {
			if (e.target === this.modal) this.closeModal();
			return;
		}
		const isClickedOnOverlay = e.target === this.menu;
		const isClickedOutside =
			this.menu && !this.menu.contains(e.target) && !this.btnToggle.contains(e.target);

		if (isClickedOnOverlay || isClickedOutside) {
			this.closeMenu();
		}
	}

	_handleEscape(e) {
		if (e.key === "Escape" && this.isOpen) {
			if (this.modal) this.closeModal();
			else this.closeMenu();
		}
	}

	changeLanguage(langCode) {
		this.closeModal();
		this.closeMenu();
		const current = localStorage.getItem("appLang") || "uk";
		const label = langCode === "en" ? "English" : "Українська";
		const icon = langCode === "en" ? "ri-global-line" : "ri-translate-2";

		if (current === langCode) {
			this._showToast(`Мова інтерфейсу: ${label}`, icon);
			return;
		}

		localStorage.setItem("appLang", langCode);
		this._showToast(`Зміна мови на: ${label}...`, icon);
		setTimeout(() => {
			window.location.reload();
		}, 300);
	}

	cycleLanguage() {
		this.openModal();
	}

	_showToast(text, iconClass) {
		let toast = document.getElementById("status-filter-toast");
		if (!toast) {
			toast = document.createElement("div");
			toast.id = "status-filter-toast";
			toast.className = "status-filter-toast hidden";
			document.body.appendChild(toast);
		}

		toast.innerHTML = `
			<i class="${iconClass} toast-icon"></i>
			<span class="toast-text">${text}</span>
		`;

		toast.className = "status-filter-toast show";

		setTimeout(() => {
			toast.classList.remove("show");
			setTimeout(() => {
				if (!toast.classList.contains("show")) {
					toast.classList.add("hidden");
				}
			}, 250);
		}, 1800);
	}

	destroy() {
		if (this.isOpen) {
			this.closeMenu();
		}

		// Повертаємо вузол на місце при знищенні компонента
		if (
			this.menuParent &&
			this.menu &&
			this.menu.parentElement !== this.menuParent
		) {
			this.menuParent.appendChild(this.menu);
		}

		if (this.btnToggle) {
			this.btnToggle.removeEventListener("click", this._handleToggleClick);
		}

		if (this.menu) {
			this.menu.removeEventListener("click", this._handleMenuClick);
		}
	}
}
