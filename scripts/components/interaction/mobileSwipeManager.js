// scripts/components/interaction/mobileSwipeManager.js

export class MobileSwipeManager {
	/**
	 * @param {Object} options - Конфігурація свайпу
	 * @param {Function} options.onSwipeLeft - Коллбек при свайпі вліво (наступний)
	 * @param {Function} options.onSwipeRight - Коллбек при свайпі вправо (попередній)
	 * @param {number} options.threshold - Мінімальна дистанція зсуву (px)
	 * @param {number} options.timeout - Максимальний час жесту (ms)
	 */
	constructor(options = {}) {
		this.onSwipeLeft = options.onSwipeLeft || null;
		this.onSwipeRight = options.onSwipeRight || null;
		this.threshold = options.threshold || 50;
		this.timeout = options.timeout || 600;

		this.startX = 0;
		this.startY = 0;
		this.startTime = 0;
		this.isSwiping = false;
		this.isDisabled = false;

		// Жорсткий біндинг для збереження контексту
		this._handleTouchStart = this._handleTouchStart.bind(this);
		this._handleTouchMove = this._handleTouchMove.bind(this);
		this._handleTouchEnd = this._handleTouchEnd.bind(this);

		this.init();
	}

	init() {
		// Блокуємо апаратний свайп браузера "Назад/Вперед" на рівні всього документа
		document.documentElement.style.touchAction = "pan-y";

		document.addEventListener("touchstart", this._handleTouchStart, {
			passive: true,
		});
		// passive: false критично важливий для можливості виклику preventDefault()
		document.addEventListener("touchmove", this._handleTouchMove, {
			passive: false,
		});
		document.addEventListener("touchend", this._handleTouchEnd, {
			passive: true,
		});
	}

	_checkIfDisabled(target) {
		// Ігноруємо свайпи, якщо відкриті модалки, галерея, меню або інтерактивні поля
		const ignoreSelectors = [
			"#breadcrumbs-container",
			".breadcrumbs-wrapper",
			"#breadcrumbs-list",
			".breadcrumbs__list",
			".breadcrumbs__item",
			".breadcrumbs__link",
			".breadcrumbs-container",
			"[class*='breadcrumbs']",
			"nav",
			".gallery-scroll-content",
			".popup-overlay",
			".breadcrumbs__dropdown-menu",
			".breadcrumbs__overlay",
			".panel-resizer",
			"input",
			"textarea",
			"select",
			"audio",
			"video",
		];

		// Блокуємо свайпи, якщо відкрито модальне вікно, галерею або аналітику
		const analyticsView = document.getElementById("analytics-view");
		if (
			document.body.classList.contains("pswp-open") ||
			document.body.classList.contains("no-scroll") ||
			document.body.classList.contains("in-analytics") ||
			(analyticsView && !analyticsView.classList.contains("hidden")) ||
			document.querySelector(".popup-overlay.show, .popup-overlay.open, .popup-overlay:not(.hidden)") !== null
		) {
			return true;
		}

		if (target && target.closest) {
			if (target.closest(ignoreSelectors.join(", ")) !== null) {
				return true;
			}
			if (target.closest(".analytics-dialog, .analytics-view") !== null) {
				return true;
			}
		}

		const isMobile =
			window.innerWidth <= 768 ||
			window.matchMedia("(max-width: 768px)").matches;
		const profileEl = document.getElementById("profile-content");
		const isProfileActive =
			profileEl && !profileEl.classList.contains("hidden");

		// Якщо це десктоп і ми не в профілі (наприклад, дерево з власним зумом) — не перехоплюємо свайпи
		if (!isMobile && !isProfileActive) {
			return true;
		}

		return false;
	}

	_handleTouchStart(e) {
		if (e.touches.length !== 1) {
			this.isDisabled = true;
			return;
		}

		if (this._checkIfDisabled(e.target)) {
			this.isDisabled = true;
			return;
		}

		this.isDisabled = false;
		this.isSwiping = false;
		this.startX = e.touches[0].clientX;
		this.startY = e.touches[0].clientY;
		this.startTime = Date.now();
	}

	_handleTouchMove(e) {
		if (this.isDisabled || !this.startX) return;

		const currentX = e.touches[0].clientX;
		const currentY = e.touches[0].clientY;
		const dx = this.startX - currentX;
		const dy = this.startY - currentY;
		const absX = Math.abs(dx);
		const absY = Math.abs(dy);

		// Якщо користувач почав чіткий вертикальний скрол — вимикаємо свайп для цього жесту,
		// щоб нативний вертикальний скрол сторінки працював плавно без затримок
		if (!this.isSwiping && absY > 25 && absY > absX * 1.2) {
			this.isDisabled = true;
			return;
		}

		// Свайп фіксується тільки якщо переважає горизонтальний рух
		if (absX > absY * 1.3 && absX > 15) {
			this.isSwiping = true;
			if (e.cancelable) {
				e.preventDefault();
			}
		}
	}

	_handleTouchEnd(e) {
		if (this.isDisabled || !this.startX) {
			this.startX = 0;
			this.startY = 0;
			this.isSwiping = false;
			return;
		}

		const currentX = e.changedTouches[0].clientX;
		const currentY = e.changedTouches[0].clientY;
		const dx = this.startX - currentX; // Позитивне значення = рух вліво (Next)
		const dy = this.startY - currentY;
		const elapsedTime = Date.now() - this.startTime;

		this.startX = 0;
		this.startY = 0;

		const absX = Math.abs(dx);
		const absY = Math.abs(dy);

		// Чіткий горизонтальний свайп
		if (
			(this.isSwiping || absX > absY * 1.2) &&
			elapsedTime <= this.timeout &&
			absX >= this.threshold &&
			absY <= 150
		) {
			if (dx > 0) {
				// Змах вліво (наступний елемент)
				if (typeof this.onSwipeLeft === "function") this.onSwipeLeft();
			} else {
				// Змах вправо (попередній елемент)
				if (typeof this.onSwipeRight === "function") this.onSwipeRight();
			}
		}
		this.isSwiping = false;
	}

	destroy() {
		document.documentElement.style.touchAction = "";
		document.removeEventListener("touchstart", this._handleTouchStart);
		document.removeEventListener("touchmove", this._handleTouchMove);
		document.removeEventListener("touchend", this._handleTouchEnd);
	}
}
