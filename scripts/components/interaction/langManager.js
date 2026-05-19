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
		};

		const activeCode = displayMap[rawLang] || rawLang.toUpperCase();
		this.btnToggle.innerHTML = `<span class="lang-code-text">${activeCode}</span>`;
	}

	toggleMenu() {
		if (this.isOpen) {
			this.closeMenu();
		} else {
			this.isOpen = true;

			// 🔥 ПАТТЕРН "ПОРТАЛ" (Вирішує баг зі зсувом меню)
			// Якщо це мобільний телефон (< 768px), переміщуємо меню прямо в body
			if (window.matchMedia("(max-width: 768px)").matches) {
				document.body.appendChild(this.menu);
			}
			// Якщо це ПК, повертаємо меню назад до кнопки (якщо воно було переміщене)
			else if (this.menuParent && this.menu.parentElement !== this.menuParent) {
				this.menuParent.appendChild(this.menu);
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
		if (localStorage.getItem("appLang") === langCode) return;
		localStorage.setItem("appLang", langCode);
		window.location.reload();
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
