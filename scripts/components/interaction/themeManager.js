// ./scripts/components/interaction/themeManager.js

export class ThemeManager {
	constructor() {
		this.btnToggle = document.getElementById("theme-toggle");
		this.icon = this.btnToggle ? this.btnToggle.querySelector("i") : null;

		// Кешування контексту для коректного вивільнення пам'яті
		this._toggleTheme = this._toggleTheme.bind(this);
		this._systemThemeListener = this._systemThemeListener.bind(this);

		this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

		this.init();
	}

	init() {
		if (!this.btnToggle) return;

		// Читання попередньо встановленого стану (уникнення FOUC)
		const isDark = document.documentElement.classList.contains("theme-dark");
		this.updateIcon(isDark);

		this.btnToggle.addEventListener("click", this._toggleTheme);

		// Реєстрація системного перехоплювача
		if (this.mediaQuery.addEventListener) {
			this.mediaQuery.addEventListener("change", this._systemThemeListener);
		}
	}

	_toggleTheme() {
		const isNowDark = document.documentElement.classList.toggle("theme-dark");
		localStorage.setItem("appTheme", isNowDark ? "dark" : "light");
		this.updateIcon(isNowDark);
	}

	_systemThemeListener(e) {
		// Блокування системної зміни, якщо користувач здійснив ручний вибір
		const savedTheme = localStorage.getItem("appTheme");
		if (!savedTheme) {
			const isNowDark = e.matches;
			document.documentElement.classList.toggle("theme-dark", isNowDark);
			this.updateIcon(isNowDark);
		}
	}

	updateIcon(isDark) {
		if (!this.icon || !this.btnToggle) return;

		// Усунуто дублювання if/else
		this.icon.className = isDark ? "ri-sun-line" : "ri-moon-line";

		const label = isDark ? "Світла тема" : "Темна тема";
		this.btnToggle.title = label;
		this.btnToggle.setAttribute("aria-label", label);
	}

	/**
	 * Деструктор. Викликати при знищенні компонента для запобігання Memory Leaks.
	 */
	destroy() {
		if (this.btnToggle) {
			this.btnToggle.removeEventListener("click", this._toggleTheme);
		}
		if (this.mediaQuery && this.mediaQuery.removeEventListener) {
			this.mediaQuery.removeEventListener("change", this._systemThemeListener);
		}
		this.btnToggle = null;
		this.icon = null;
	}
}
