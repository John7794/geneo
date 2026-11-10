// ./scripts/components/interaction/statusFilterManager.js

/**
 * Керування фільтрацією дерева та віяла за достовірністю родинного зв'язку.
 * Підтримувані режими:
 *  - "all": Усі родичі (без приглушення)
 *  - "confirmed_indirect": Підтверджені та опосередковані зв'язки (гіпотетичні приглушено)
 *  - "confirmed_only": Тільки прямі підтверджені зв'язки (опосередковані та гіпотетичні приглушено)
 */

export const STATUS_FILTER_MODES = {
	ALL: "all",
	CONFIRMED_INDIRECT: "confirmed_indirect",
	CONFIRMED_ONLY: "confirmed_only",
};

const FILTER_CONFIG = {
	all: {
		key: "all",
		icon: "ri-shield-line",
		label: "Усі",
		title: "Фільтр зв'язку: Усі родичі (клікніть для перемикання)",
		toast: "Показ усіх родичів",
		toastIcon: "ri-shield-line",
		accentClass: "",
	},
	confirmed_indirect: {
		key: "confirmed_indirect",
		icon: "ri-shield-keyhole-line",
		label: "Достовірні",
		title: "Фільтр зв'язку: Підтверджені + Опосередковані (клікніть для перемикання)",
		toast: "Підтверджені та опосередковані зв'язки",
		toastIcon: "ri-shield-keyhole-line",
		accentClass: "filter-active--indirect",
	},
	confirmed_only: {
		key: "confirmed_only",
		icon: "ri-shield-check-fill",
		label: "Тільки прямі",
		title: "Фільтр зв'язку: Тільки прямі підтверджені (клікніть для перемикання)",
		toast: "Лише прямі підтверджені зв'язки",
		toastIcon: "ri-shield-check-fill",
		accentClass: "filter-active--confirmed",
	},
};

const STORAGE_KEY = "geneo_status_filter_mode";

export class StatusFilterManager {
	constructor(callbacks = {}) {
		this.mode = localStorage.getItem(STORAGE_KEY) || STATUS_FILTER_MODES.ALL;
		if (!FILTER_CONFIG[this.mode]) {
			this.mode = STATUS_FILTER_MODES.ALL;
		}

		this.listeners = new Set();
		if (typeof callbacks.onFilterChange === "function") {
			this.listeners.add(callbacks.onFilterChange);
		}

		this._toastTimer = null;

		// Біндинг обробників подій
		this.cycleMode = this.cycleMode.bind(this);
		this.setMode = this.setMode.bind(this);

		this._initDOM();
		this.applyMode(false);
	}

	_initDOM() {
		// Кнопка у головному доку
		const dockBtn = document.getElementById("btn-status-filter");
		if (dockBtn) {
			dockBtn.addEventListener("click", () => this.cycleMode());
		}

		// Кнопка у плаваючих інструментах дерева
		const treeBtn = document.getElementById("btn-tree-status-filter");
		if (treeBtn) {
			treeBtn.addEventListener("click", () => this.cycleMode());
		}

		// Кнопка у плаваючих інструментах віяла
		const fanBtn = document.getElementById("fan-btn-status-filter");
		if (fanBtn) {
			fanBtn.addEventListener("click", () => this.cycleMode());
		}

		// Делегування для кнопок мобільного меню
		document.addEventListener("click", (e) => {
			const segBtn = e.target.closest(".mobile-status-seg-btn");
			if (segBtn) {
				const targetMode = segBtn.getAttribute("data-status-filter");
				if (targetMode && FILTER_CONFIG[targetMode]) {
					this.setMode(targetMode, true);
				}
			}
		});
	}

	/**
	 * Циклічне перемикання між 3 станами
	 */
	cycleMode() {
		let nextMode = STATUS_FILTER_MODES.ALL;
		if (this.mode === STATUS_FILTER_MODES.ALL) {
			nextMode = STATUS_FILTER_MODES.CONFIRMED_INDIRECT;
		} else if (this.mode === STATUS_FILTER_MODES.CONFIRMED_INDIRECT) {
			nextMode = STATUS_FILTER_MODES.CONFIRMED_ONLY;
		} else {
			nextMode = STATUS_FILTER_MODES.ALL;
		}
		this.setMode(nextMode, true);
	}

	/**
	 * Встановлення конкретного режиму фільтрації
	 * @param {string} mode 
	 * @param {boolean} showToast 
	 */
	setMode(mode, showToast = true) {
		if (!FILTER_CONFIG[mode]) return;
		this.mode = mode;
		localStorage.setItem(STORAGE_KEY, mode);

		this.applyMode(showToast);

		// Сповіщаємо підписників (наприклад, для перерахунку бейджів віяла)
		this.listeners.forEach((cb) => {
			try {
				cb(this.mode);
			} catch (err) {
				console.error("[StatusFilter] Callback error:", err);
			}
		});
	}

	/**
	 * Застосовує поточний стан до DOM (body attribute, кнопки, бейджі)
	 * @param {boolean} showToast 
	 */
	applyMode(showToast = false) {
		const config = FILTER_CONFIG[this.mode] || FILTER_CONFIG.all;

		// 1. Атрибут на body керує всіма стилями через CSS селектори
		document.body.setAttribute("data-status-filter", this.mode);

		// 2. Оновлення головної кнопки в доку (#btn-status-filter)
		const dockBtn = document.getElementById("btn-status-filter");
		if (dockBtn) {
			dockBtn.setAttribute("title", config.title);
			dockBtn.setAttribute("data-filter", this.mode);
			dockBtn.className = `btn btn-icon js-status-filter ${config.accentClass}`;
			const iconEl = dockBtn.querySelector("i");
			if (iconEl) iconEl.className = config.icon;

			const badge = dockBtn.querySelector("#status-filter-badge");
			if (badge) {
				badge.classList.toggle("hidden", this.mode === STATUS_FILTER_MODES.ALL);
				badge.className = `badge-dot badge-dot--tr ${this.mode === STATUS_FILTER_MODES.CONFIRMED_ONLY ? "badge-dot--green" : "badge-dot--blue"}`;
				if (this.mode === STATUS_FILTER_MODES.ALL) badge.classList.add("hidden");
			}
		}

		// 3. Оновлення кнопки в zoom-controls дерева (#btn-tree-status-filter)
		const treeBtn = document.getElementById("btn-tree-status-filter");
		if (treeBtn) {
			treeBtn.setAttribute("title", config.title);
			treeBtn.className = `btn btn-icon ${config.accentClass}`;
			const iconEl = treeBtn.querySelector("i");
			if (iconEl) iconEl.className = config.icon;
		}

		// 4. Оновлення кнопки в fan-zoom-controls віяла (#fan-btn-status-filter)
		const fanBtn = document.getElementById("fan-btn-status-filter");
		if (fanBtn) {
			fanBtn.setAttribute("title", config.title);
			fanBtn.className = `fan-zoom-btn ${config.accentClass} ${this.mode !== STATUS_FILTER_MODES.ALL ? "active" : ""}`;
			const iconEl = fanBtn.querySelector("i");
			if (iconEl) iconEl.className = config.icon;
		}

		// 5. Оновлення сегментованого перемикача в мобільному меню
		document.querySelectorAll(".mobile-status-seg-btn").forEach((btn) => {
			const bMode = btn.getAttribute("data-status-filter");
			btn.classList.toggle("active", bMode === this.mode);
		});

		// 6. Оновлення опису в мобільному списку дій
		const mobileDesc = document.getElementById("mobile-status-filter-desc");
		if (mobileDesc) {
			mobileDesc.textContent = config.label;
		}

		// 7. Спливаюче сповіщення (Toast)
		if (showToast) {
			this._showToast(config.toast, config.toastIcon, this.mode);
		}
	}

	_showToast(text, iconClass, mode) {
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

		toast.className = `status-filter-toast toast--${mode} show`;

		if (this._toastTimer) clearTimeout(this._toastTimer);
		this._toastTimer = setTimeout(() => {
			toast.classList.remove("show");
			setTimeout(() => {
				if (!toast.classList.contains("show")) {
					toast.classList.add("hidden");
				}
			}, 250);
		}, 1800);
	}

	subscribe(callback) {
		if (typeof callback === "function") {
			this.listeners.add(callback);
		}
		return () => this.listeners.delete(callback);
	}

	getMode() {
		return this.mode;
	}
}
