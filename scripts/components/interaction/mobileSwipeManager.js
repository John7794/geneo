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
		// Ігноруємо свайпи, якщо відкриті модалки, галерея, меню або активовано зум
		const ignoreSelectors = [
			".gallery-scroll-content",
			".popup-overlay",
			".breadcrumbs__dropdown-menu",
			".breadcrumbs__overlay",
			".panel-resizer",
		];

		if (
			document.body.classList.contains("pswp-open") ||
			document.body.classList.contains("no-scroll")
		) {
			return true;
		}

		return target.closest(ignoreSelectors.join(", ")) !== null;
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

		// Якщо користувач свайпає горизонтально переважно (X > Y) і перетнув базовий поріг
		if (Math.abs(dx) > Math.abs(dy) * 1.2 && Math.abs(dx) > 10) {
			this.isSwiping = true;
			if (e.cancelable) {
				e.preventDefault();
			}
		}
	}

	_handleTouchEnd(e) {
		if (this.isDisabled || !this.startX) {
			this.startX = 0;
			return;
		}

		const currentX = e.changedTouches[0].clientX;
		const currentY = e.changedTouches[0].clientY;
		const dx = this.startX - currentX; // Позитивне значення = рух вліво (Next)
		const dy = this.startY - currentY;
		const elapsedTime = Date.now() - this.startTime;

		this.startX = 0;
		this.startY = 0;

		// Більш м'які пороги: dy <= 160 дозволяє дугоподібні свайпи
		if (
			this.isSwiping &&
			elapsedTime <= this.timeout &&
			Math.abs(dx) >= this.threshold &&
			Math.abs(dy) <= 160
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
