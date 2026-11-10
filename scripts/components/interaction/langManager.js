// ./scripts/components/interaction/langManager.js

import { UI_CLASSES } from "../../core/uiClasses.js";

export class LangManager {
	constructor() {
		this.btnToggle = document.getElementById("btn-lang-toggle");
		this.menu = document.getElementById("lang-menu");

		this.isOpen = false;
		this.menuParent = null; // Змінна для збереження оригінального місця меню

		// Жорстка фіксація контексту
		this.toggleMenu = this.toggleMenu.bind(this);
		this.closeMenu = this.closeMenu.bind(this);
		this._handleOutsideClick = this._handleOutsideClick.bind(this);
		this._handleEscape = this._handleEscape.bind(this);
		this._handleMenuClick = this._handleMenuClick.bind(this);
		this._handleToggleClick = this._handleToggleClick.bind(this);

		this.init();
	}

	init() {
		if (!this.btnToggle || !this.menu) {
			console.warn("LangManager: Не знайдено кнопку або меню мов.");
			return;
		}

		// 🔥 Запам'ятовуємо батьківський контейнер меню для десктопу
		this.menuParent = this.menu.parentElement;

		this._renderActiveLanguage();

		// Навішування подій
		this.btnToggle.addEventListener("click", this._handleToggleClick);
		this.menu.addEventListener("click", this._handleMenuClick);
	}

	_handleToggleClick(e) {
		e.stopPropagation();
		this.toggleMenu();
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

		const mobileLangDesc = document.querySelector('[data-action="lang"] .mobile-nav-desc');
		if (mobileLangDesc) {
			mobileLangDesc.textContent = rawLang === "en" ? "English (активна)" : "Українська (активна)";
		}
	}

	toggleMenu() {
		if (this.isOpen) {
			this.closeMenu();
		} else {
			this.isOpen = true;

			// Портал прямо в body для усунення внутрішнього скролу в панелі інструментів
			document.body.appendChild(this.menu);

			if (window.matchMedia("(max-width: 768px)").matches) {
				// Мобільна розмітка обробляється через @media в lang-menu.css
				this.menu.style.position = "";
				this.menu.style.top = "";
				this.menu.style.right = "";
				this.menu.style.left = "";
				this.menu.style.bottom = "";
				this.menu.style.zIndex = "30005";
			} else if (this.btnToggle) {
				// Десктоп: фіксоване позиціонування ліворуч від кнопки
				const rect = this.btnToggle.getBoundingClientRect();
				this.menu.style.position = "fixed";
				this.menu.style.top = `${rect.top}px`;
				this.menu.style.right = `${window.innerWidth - rect.left + 12}px`;
				this.menu.style.left = "auto";
				this.menu.style.bottom = "auto";
				this.menu.style.zIndex = "30005";
			}

			this.menu.classList.remove(UI_CLASSES.hidden || "hidden");

			// Блокуємо скрол фону
			document.body.classList.add(UI_CLASSES.noScroll || "no-scroll");

			requestAnimationFrame(() => {
				this.menu.classList.add("show");
			});

			document.addEventListener("click", this._handleOutsideClick);
			document.addEventListener("keydown", this._handleEscape);
		}
	}

	closeMenu() {
		if (!this.isOpen) return;
		this.isOpen = false;

		this.menu.classList.remove("show");

		// Розблоковуємо скрол
		document.body.classList.remove(UI_CLASSES.noScroll || "no-scroll");

		document.removeEventListener("click", this._handleOutsideClick);
		document.removeEventListener("keydown", this._handleEscape);

		setTimeout(() => {
			if (!this.isOpen) {
				this.menu.classList.add(UI_CLASSES.hidden || "hidden");
				if (this.menuParent && this.menu.parentElement !== this.menuParent) {
					this.menuParent.appendChild(this.menu);
				}
				this.menu.style.position = "";
				this.menu.style.top = "";
				this.menu.style.right = "";
				this.menu.style.left = "";
				this.menu.style.bottom = "";
				this.menu.style.zIndex = "";
			}
		}, 150);
	}

	_handleOutsideClick(e) {
		if (!this.isOpen) return;

		// 1. Перевірка для мобільної версії: чи був клік рівно по фону-оверлею
		const isClickedOnOverlay = e.target === this.menu;

		// 2. Перевірка для десктопу: чи був клік за межами випадаючого списку
		const isClickedOutside =
			!this.menu.contains(e.target) && !this.btnToggle.contains(e.target);

		// Якщо клікнули по блюру АБО десь зовні на ПК — закриваємо меню
		if (isClickedOnOverlay || isClickedOutside) {
			this.closeMenu();
		}
	}

	_handleEscape(e) {
		if (e.key === "Escape" && this.isOpen) {
			this.closeMenu();
		}
	}

	changeLanguage(langCode) {
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
		const current = localStorage.getItem("appLang") || "uk";
		const next = current === "uk" ? "en" : "uk";
		this.changeLanguage(next);
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
