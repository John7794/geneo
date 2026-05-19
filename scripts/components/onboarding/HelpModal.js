// ./scripts/components/onboarding/HelpModal.js

import { UI_CLASSES } from "../../core/uiClasses.js";

/**
 * Модуль управління статичним інтерфейсом довідкового центру.
 * Забезпечує навігацію між секціями документації.
 */
export class HelpModal {
	constructor() {
		this.overlay = document.getElementById("help-overlay");
		this.btnClose = document.getElementById("btn-close-help");
		this.isOpen = false;

		this.close = this.close.bind(this);
		this._handleTabSwitch = this._handleTabSwitch.bind(this);
		this._handleKeyDown = this._handleKeyDown.bind(this);

		this.init();
	}

	init() {
		if (!this.overlay) {
			console.warn("Вузол #help-overlay не знайдено в DOM.");
			return;
		}

		if (this.btnClose) {
			this.btnClose.addEventListener("click", this.close);
		}

		const tabButtons = this.overlay.querySelectorAll(".help-tab-btn");
		tabButtons.forEach((btn) =>
			btn.addEventListener("click", this._handleTabSwitch),
		);
	}

	open() {
		if (!this.overlay || this.isOpen) return;
		this.isOpen = true;

		this.overlay.classList.remove("hidden");
		document.body.classList.add(UI_CLASSES.noScroll || "no-scroll");

		document.addEventListener("keydown", this._handleKeyDown, true);

		requestAnimationFrame(() => {
			this.overlay.classList.add("show");

			const firstTab = this.overlay.querySelector(".help-tab-btn");
			if (firstTab) firstTab.focus();
		});
	}

	close() {
		if (!this.overlay || !this.isOpen) return;
		this.isOpen = false;

		this.overlay.classList.remove("show");
		document.body.classList.remove(UI_CLASSES.noScroll || "no-scroll");
		document.removeEventListener("keydown", this._handleKeyDown, true);

		setTimeout(() => {
			this.overlay.classList.add("hidden");
		}, 200);
	}

	_handleKeyDown(e) {
		// Залишено виключно локальну навігацію вкладками.
		// Escape та Tab перехоплює глобальний диспетчер.
		if (e.key === "ArrowUp" || e.key === "ArrowDown") {
			e.preventDefault();
			this._navigateTabs(e.key);
		}
	}

	_navigateTabs(direction) {
		const tabs = Array.from(this.overlay.querySelectorAll(".help-tab-btn"));
		if (!tabs.length) return;

		const currentIndex = tabs.findIndex((tab) =>
			tab.classList.contains("active"),
		);
		let newIndex = currentIndex;

		if (direction === "ArrowDown") {
			newIndex = (currentIndex + 1) % tabs.length;
		} else if (direction === "ArrowUp") {
			newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
		}

		tabs[newIndex].click();
		tabs[newIndex].focus();

		tabs[newIndex].scrollIntoView({ block: "nearest", behavior: "smooth" });
	}

	_handleTabSwitch(e) {
		const targetId = e.currentTarget.getAttribute("data-target");

		const buttons = this.overlay.querySelectorAll(".help-tab-btn");
		buttons.forEach((btn) => btn.classList.remove("active"));
		e.currentTarget.classList.add("active");

		const panes = this.overlay.querySelectorAll(".help-pane");
		panes.forEach((pane) => {
			pane.classList.remove("active");
			pane.classList.add("hidden");
		});

		const activePane = this.overlay.querySelector(`#${targetId}`);
		if (activePane) {
			activePane.classList.remove("hidden");
			activePane.classList.add("active");

			activePane.scrollTop = 0;
		}
	}

	destroy() {
		if (this.overlay) {
			this.close();
		}
	}
}
