// scripts/components/interaction/navigationManager.js

import { UI_CLASSES } from "../../core/uiClasses.js";

export class NavigationManager {
	constructor(sortedIds = [], onProfileChange) {
		this.sortedIds = sortedIds;
		this.onChange = onProfileChange;
		this.currentIndex = 0;

		// Захист від затискання клавіші (250 мс між перемиканнями)
		this.throttleTime = 250;
		this.lastMoveTime = 0;

		this.btnPrev = document.getElementById("btn-prev");
		this.btnNext = document.getElementById("btn-next");

		// Ізольовані таймери для кнопок, щоб не "забруднювати" DOM-елементи
		this._timers = new Map();

		// Прив'язуємо контекст
		this._handleKeyDown = this._handleKeyDown.bind(this);
		this._handlePrevClick = this._handlePrevClick.bind(this);
		this._handleNextClick = this._handleNextClick.bind(this);

		this.initListeners();
		this.updateButtonsState();
	}

	updateList(newSortedIds) {
		this.sortedIds = newSortedIds || [];
		this.updateButtonsState();
	}

	start(startId) {
		if (!this.sortedIds.length) return;

		this.currentIndex = this.sortedIds.indexOf(String(startId));
		if (this.currentIndex === -1) this.currentIndex = 0;

		this.updateButtonsState();
	}

	updateButtonsState() {
		const shouldDisable = this.sortedIds.length <= 1;

		if (this.btnPrev) {
			this.btnPrev.disabled = shouldDisable;
			this.btnPrev.classList.toggle(
				UI_CLASSES.isDisabled || "is-disabled",
				shouldDisable,
			);
		}
		if (this.btnNext) {
			this.btnNext.disabled = shouldDisable;
			this.btnNext.classList.toggle(
				UI_CLASSES.isDisabled || "is-disabled",
				shouldDisable,
			);
		}
	}

	initListeners() {
		if (this.btnPrev)
			this.btnPrev.addEventListener("click", this._handlePrevClick);
		if (this.btnNext)
			this.btnNext.addEventListener("click", this._handleNextClick);

		document.addEventListener("keydown", this._handleKeyDown);
	}

	_handlePrevClick(e) {
		e.preventDefault();
		this.move(-1);
	}

	_handleNextClick(e) {
		e.preventDefault();
		this.move(1);
	}

	_triggerVisualFeedback(btn) {
		if (!btn || btn.disabled) return;

		const pressedClass = UI_CLASSES.isPressed || "pressed";

		// Якщо таймер для цієї кнопки вже існує, скидаємо його
		if (this._timers.has(btn)) {
			clearTimeout(this._timers.get(btn));
		}

		btn.classList.add(pressedClass);

		// Зберігаємо новий таймер у Map
		const timerId = setTimeout(() => {
			btn.classList.remove(pressedClass);
			this._timers.delete(btn);
		}, 150);

		this._timers.set(btn, timerId);
	}

	_handleKeyDown(e) {
		if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;

		if (
			e.target.tagName === "INPUT" ||
			e.target.tagName === "TEXTAREA" ||
			e.target.isContentEditable
		) {
			return;
		}

		// Блокуємо навігацію стрілками, якщо відкрито модальне вікно або галерею
		if (document.body.classList.contains(UI_CLASSES.noScroll || "no-scroll")) {
			return;
		}

		if (e.key === "ArrowLeft") {
			e.preventDefault();
			this._triggerVisualFeedback(this.btnPrev);
			this.move(-1);
		} else if (e.key === "ArrowRight") {
			e.preventDefault();
			this._triggerVisualFeedback(this.btnNext);
			this.move(1);
		}
	}

	move(direction) {
		if (this.sortedIds.length <= 1) return;

		const now = Date.now();
		if (now - this.lastMoveTime < this.throttleTime) return;
		this.lastMoveTime = now;

		let newIndex = this.currentIndex + direction;

		if (newIndex < 0) newIndex = this.sortedIds.length - 1;
		if (newIndex >= this.sortedIds.length) newIndex = 0;

		this.currentIndex = newIndex;
		const newId = this.sortedIds[this.currentIndex];

		if (this.onChange) {
			this.onChange(newId);
		}
	}

	destroy() {
		if (this.btnPrev)
			this.btnPrev.removeEventListener("click", this._handlePrevClick);
		if (this.btnNext)
			this.btnNext.removeEventListener("click", this._handleNextClick);

		document.removeEventListener("keydown", this._handleKeyDown);

		// Очищення всіх активних таймерів для запобігання змінам DOM після знищення об'єкта
		this._timers.forEach((timerId) => clearTimeout(timerId));
		this._timers.clear();
	}
}
