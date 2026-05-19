// ./scripts/core/globalModalInterceptor.js

/**
 * Глобальний диспетчер модальних взаємодій.
 * Забезпечує ізоляцію фокусу, перехоплення Escape та обробку кліків по фону (overlay).
 * Автономний модуль (без зовнішніх залежностей).
 */
export class GlobalModalInterceptor {
	constructor() {
		this.focusableElementsString =
			'a[href]:not([disabled]):not([aria-hidden="true"]), ' +
			'button:not([disabled]):not([aria-hidden="true"]), ' +
			'textarea:not([disabled]):not([aria-hidden="true"]), ' +
			'input:not([disabled]):not([aria-hidden="true"]), ' +
			'select:not([disabled]):not([aria-hidden="true"]), ' +
			'iframe:not([aria-hidden="true"]), ' +
			'object:not([aria-hidden="true"]), ' +
			'embed:not([aria-hidden="true"]), ' +
			'[tabindex]:not([tabindex="-1"]):not([aria-hidden="true"]), ' +
			"[contenteditable]";

		this._handleKeyDown = this._handleKeyDown.bind(this);
		this._handleClick = this._handleClick.bind(this);
	}

	init() {
		// Фаза захоплення (capture phase) для беззаперечного пріоритету
		document.addEventListener("keydown", this._handleKeyDown, true);
		document.addEventListener("click", this._handleClick, true);
	}

	destroy() {
		document.removeEventListener("keydown", this._handleKeyDown, true);
		document.removeEventListener("click", this._handleClick, true);
	}

	/**
	 * Ідентифікація активного модального вікна верхнього рівня.
	 * Базується на ARIA-ролях та загальноприйнятих класах, перевіряючи фізичну видимість.
	 */
	_getActivePopup() {
		const popups = Array.from(
			document.querySelectorAll('.popup-overlay, [role="dialog"]'),
		);

		const visiblePopups = popups.filter(
			(p) => p.offsetWidth > 0 || p.offsetHeight > 0,
		);

		if (visiblePopups.length === 0) return null;
		return visiblePopups[visiblePopups.length - 1];
	}

	_getVisibleFocusableNodes(container) {
		const nodes = Array.from(
			container.querySelectorAll(this.focusableElementsString),
		);
		return nodes.filter((node) => {
			const hasSize =
				node.offsetWidth > 0 ||
				node.offsetHeight > 0 ||
				node.getClientRects().length > 0;
			const style = window.getComputedStyle(node);
			return (
				hasSize && style.visibility !== "hidden" && style.display !== "none"
			);
		});
	}

	/**
	 * Апаратна ініціація закриття поточного вікна.
	 */
	_triggerClose(popupNode) {
		const closeBtn = popupNode.querySelector(
			".modal-close, [data-close-modal], .js-close-popup",
		);
		if (closeBtn) {
			closeBtn.click();
		}
	}

	_handleKeyDown(e) {
		if (e.key !== "Tab" && e.key !== "Escape") return;

		const activePopup = this._getActivePopup();
		if (!activePopup) return;

		if (e.key === "Escape") {
			e.preventDefault();
			e.stopPropagation();
			this._triggerClose(activePopup);
			return;
		}

		if (e.key === "Tab") {
			this._trapFocus(e, activePopup);
		}
	}

	_handleClick(e) {
		const activePopup = this._getActivePopup();
		if (!activePopup) return;

		// Перевірка прямого кліку по фоновому контейнеру
		if (
			e.target === activePopup ||
			e.target.classList.contains("popup-overlay")
		) {
			e.preventDefault();
			e.stopPropagation();
			this._triggerClose(activePopup);
		}
	}

	_trapFocus(e, activePopup) {
		const focusableNodes = this._getVisibleFocusableNodes(activePopup);

		if (focusableNodes.length === 0) {
			e.preventDefault();
			activePopup.focus();
			return;
		}

		const firstNode = focusableNodes[0];
		const lastNode = focusableNodes[focusableNodes.length - 1];
		const currentIndex = focusableNodes.indexOf(document.activeElement);

		if (e.shiftKey) {
			if (currentIndex === 0 || currentIndex === -1) {
				lastNode.focus();
				e.preventDefault();
			}
		} else {
			if (currentIndex === focusableNodes.length - 1 || currentIndex === -1) {
				firstNode.focus();
				e.preventDefault();
			}
		}
	}
}
