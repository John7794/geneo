// ./scripts/core/i18n.js

export class I18n {
	constructor(defaultLang = "uk") {
		this.lang = "uk";
		// Force local storage to uk so we don't break anywhere else
		localStorage.setItem("appLang", "uk");
		this.translations = {};
		this.basePath = "./data/locales";
		this._keyCache = new Map(); // Кеш для розібраних шляхів
	}

	async init() {
		try {
			const response = await fetch(`${this.basePath}/${this.lang}.json`);

			if (!response.ok) throw new Error(`Could not load ${this.lang}.json`);

			this.translations = await response.json();
			this._keyCache.clear(); // Інвалідація кешу при зміні словника

			this.updatePage();
			document.documentElement.lang = this.lang;
			console.log(`🌍 i18n initialized: ${this.lang}`);
		} catch (error) {
			console.error("i18n error:", error);
		}
	}

	async setLanguage(newLang) {
		if (this.lang === newLang) return;
		this.lang = newLang;
		localStorage.setItem("appLang", newLang);

		await this.init();

		// Сповіщення підсистеми рендерингу про мутацію мовного стану
		document.dispatchEvent(
			new CustomEvent("i18n:languageChanged", {
				detail: { lang: this.lang },
			}),
		);
	}

	/**
	 * Отримання тексту за прямим ключем
	 * @param {string} key - Прямий шлях (напр. 'nav.home' або 'time.monthsGenitive[0]')
	 * @param {object} params - Параметри для підстановки {name: "Ivan"}
	 */
	t(key, params = {}) {
		if (!key) return key;

		// Мемоїзація лексичних шляхів для мінімізації навантаження
		let keys = this._keyCache.get(key);
		if (!keys) {
			keys = key.split(/[\.\[\]]+/).filter(Boolean);
			this._keyCache.set(key, keys);
		}

		let obj = this.translations;

		for (let i = 0; i < keys.length; i++) {
			if (obj === undefined || obj === null) return key;
			obj = obj[keys[i]];
		}

		let text = obj;

		if (text === undefined) return key;

		// Глобальна підстановка параметрів
		if (typeof text === "string" && params) {
			for (const [paramKey, paramValue] of Object.entries(params)) {
				text = text.replaceAll(`{${paramKey}}`, paramValue);
			}
		}

		return text;
	}

	updatePage() {
		// Оптимізація селекторів: обробка статичного DOM за один прохід
		const elements = document.querySelectorAll(
			"[data-i18n], [data-i18n-title], [data-i18n-placeholder]",
		);

		elements.forEach((el) => {
			const textKey = el.getAttribute("data-i18n");
			if (textKey) {
				const translation = this.t(textKey);
				if (translation !== textKey) el.textContent = translation;
			}

			const titleKey = el.getAttribute("data-i18n-title");
			if (titleKey) {
				const translation = this.t(titleKey);
				if (translation !== titleKey) el.title = translation;
			}

			const placeholderKey = el.getAttribute("data-i18n-placeholder");
			if (placeholderKey) {
				const translation = this.t(placeholderKey);
				if (translation !== placeholderKey) el.placeholder = translation;
			}
		});
	}
}

export const i18n = new I18n();
