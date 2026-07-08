// scripts/components/interaction/breadcrumbManager.js

import { UI_CLASSES } from "../../core/uiClasses.js";
import { escapeHtml } from "../../utils/helpers.js";

export class BreadcrumbManager {
	constructor(options = {}) {
		this.listContainer = document.getElementById("breadcrumbs-list");
		this.wrapper = document.getElementById("breadcrumbs-container");
		this.activeDropdown = null;
		this.activeOverlay = null; // Зберігаємо посилання на оверлей

		this.onNavigate =
			options.onNavigate ||
			(() => console.warn("Breadcrumbs: onNavigate not provided"));

		this._handleGlobalClick = this._handleGlobalClick.bind(this);
		this._handleScrollOrResize = this._closeDropdown.bind(this);

		this._initEventListeners();
	}

	_initEventListeners() {
		window.addEventListener("click", this._handleGlobalClick);
		window.addEventListener("scroll", this._handleScrollOrResize, {
			capture: true,
			passive: true,
		});
		window.addEventListener("resize", this._handleScrollOrResize, {
			passive: true,
		});
	}

	_handleGlobalClick(e) {
		if (
			this.activeDropdown &&
			!e.target.closest(`.${UI_CLASSES.breadcrumbsDropdownMenu}`)
		) {
			this._closeDropdown();
		}
	}

	_closeDropdown() {
		if (this.activeDropdown) {
			const activeBtn = document.querySelector(
				`.${UI_CLASSES.breadcrumbsDropdownTrigger}.${UI_CLASSES.active}`,
			);
			if (activeBtn) {
				activeBtn.classList.remove(UI_CLASSES.active);
				activeBtn.setAttribute("aria-expanded", "false");
			}
			this.activeDropdown.remove();
			this.activeDropdown = null;
		}

		// Видаляємо оверлей та розблоковуємо скрол
		if (this.activeOverlay) {
			this.activeOverlay.remove();
			this.activeOverlay = null;
			document.body.classList.remove("no-scroll");
		}
	}

	_openDropdown(triggerEl, items, onSelect, currentId) {
		this._closeDropdown();
		triggerEl.classList.add(UI_CLASSES.active);
		triggerEl.setAttribute("aria-expanded", "true");

		// 1. СТВОРЮЄМО ОВЕРЛЕЙ (ЗАДНІЙ ФОН)
		const overlay = document.createElement("div");
		overlay.className = "breadcrumbs__overlay";
		overlay.onclick = (e) => {
			e.stopPropagation();
			this._closeDropdown();
		};
		document.body.appendChild(overlay);
		this.activeOverlay = overlay;

		// Блокуємо скрол сторінки
		document.body.classList.add("no-scroll");

		// 2. СТВОРЮЄМО МЕНЮ
		const rect = triggerEl.getBoundingClientRect();
		const menu = document.createElement("div");
		menu.className = `${UI_CLASSES.breadcrumbsDropdownMenu} ${UI_CLASSES.show}`;
		menu.setAttribute("role", "menu");
		menu.style.zIndex = "9999";

		// 🔥 Вираховуємо позицію тільки для десктопу! На мобілці працюватиме CSS.
		const isMobile = window.matchMedia("(max-width: 767px)").matches;
		if (!isMobile) {
			menu.style.position = "fixed";
			menu.style.top = `${rect.bottom + 4}px`;
			menu.style.left = `${rect.left}px`;
		}

		items.forEach((item) => {
			const el = document.createElement("button");
			el.className = UI_CLASSES.breadcrumbsDropdownItem;
			el.setAttribute("role", "menuitem");
			if (String(item.id) === String(currentId)) {
				el.classList.add(UI_CLASSES.active);
			}

			el.textContent = item.label || item.name;
			el.onclick = (e) => {
				e.stopPropagation();
				this._closeDropdown();
				if (onSelect) onSelect(item);
			};
			menu.appendChild(el);
		});

		document.body.appendChild(menu);
		this.activeDropdown = menu;

		// Анімація появи оверлею
		requestAnimationFrame(() => {
			overlay.classList.add("show");
		});
	}

	_createSiblingTrigger(item) {
		const trigger = document.createElement("button");
		trigger.className = UI_CLASSES.breadcrumbsDropdownTrigger;
		trigger.title = escapeHtml("Інші варіанти (брати/сестри)");
		trigger.setAttribute("aria-haspopup", "true");
		trigger.setAttribute("aria-expanded", "false");

		const currentIndex = item.siblings.findIndex(
			(s) => String(s.id) === String(item.id),
		);
		const displayIndex = currentIndex !== -1 ? currentIndex + 1 : 1;
		const total = item.siblings.length;
		const iconArrowDown =
			UI_CLASSES.icons?.arrowDownSFill || "ri-arrow-down-s-fill";

		trigger.innerHTML = `
            <span class="${UI_CLASSES.dropdownTriggerIndex}">${escapeHtml(displayIndex)}/${escapeHtml(total)}</span>
            <i class="${iconArrowDown} ${UI_CLASSES.dropdownTriggerIcon}"></i>
        `;

		trigger.onclick = (e) => {
			e.stopPropagation();
			e.preventDefault();
			this._openDropdown(
				trigger,
				item.siblings,
				(selected) => this.onNavigate(selected.id),
				item.id,
			);
		};
		return trigger;
	}

	_appendSeparator() {
		const iconArrowRight =
			UI_CLASSES.icons?.arrowRightSLine || "ri-arrow-right-s-line";
		const sep = document.createElement("span");
		sep.className = UI_CLASSES.breadcrumbsSeparator;
		sep.setAttribute("aria-hidden", "true");
		sep.innerHTML = `<i class="${iconArrowRight}"></i>`;
		this.listContainer.appendChild(sep);
	}

	renderPath(pathArray) {
		if (!this.listContainer || !this.wrapper) return;

		if (!pathArray || pathArray.length === 0) {
			pathArray = [
				{ id: "debug", name: "⚠️ Зв'язок не знайдено", siblings: [] },
			];
		}

		this.wrapper.classList.remove(UI_CLASSES.hidden);
		this.listContainer.innerHTML = "";

		const currentUrlParams = new URLSearchParams(window.location.search);
		const currentView = currentUrlParams.get("view");
		const viewString = currentView ? `&view=${currentView}` : "";

		pathArray.forEach((item, index) => {
			const isLast = index === pathArray.length - 1;
			const itemWrapper = document.createElement("div");
			itemWrapper.className = UI_CLASSES.breadcrumbsItemWrapper;

			const link = document.createElement("a");
			link.textContent = item.name || "Невідомо";

			if (isLast) {
				link.className = `${UI_CLASSES.breadcrumbsLink} ${UI_CLASSES.breadcrumbsLinkActive}`;
				link.setAttribute("aria-current", "page");
			} else {
				link.className = `${UI_CLASSES.breadcrumbsLink} ${UI_CLASSES.breadcrumbItem}`;
				link.href = `?id=${escapeHtml(item.id)}${viewString}`;
				link.onclick = (e) => {
					e.preventDefault();

					// 🔥 ДОДАЙТЕ ОДИН ЦЕЙ РЯДОК:
					e.stopPropagation();

					this.onNavigate(item.id);
				};
			}

			itemWrapper.appendChild(link);

			if (item.siblings && item.siblings.length > 1) {
				itemWrapper.appendChild(this._createSiblingTrigger(item));
			}

			this.listContainer.appendChild(itemWrapper);

			if (!isLast) {
				this._appendSeparator();
			}
		});

		this._autoScroll();
	}

	renderRelationshipTabs(branches, activeIndex, onSwitch) {
		if (!this.listContainer || !this.wrapper) return;

		if (!branches || branches.length === 0) {
			this.wrapper.classList.add(UI_CLASSES.hidden);
			return;
		}

		this.wrapper.classList.remove(UI_CLASSES.hidden);
		this.listContainer.innerHTML = "";

		branches.forEach((branch, index) => {
			const itemWrapper = document.createElement("div");
			itemWrapper.className = UI_CLASSES.breadcrumbsItemWrapper;

			const link = document.createElement("button");
			link.className = "breadcrumbs-tab-btn";
			link.textContent = branch.label;

			if (index === activeIndex) {
				link.classList.add(
					UI_CLASSES.breadcrumbsLink,
					UI_CLASSES.breadcrumbsLinkActive,
				);
				link.setAttribute("aria-current", "page");
			} else {
				link.classList.add(
					UI_CLASSES.breadcrumbsLink,
					UI_CLASSES.breadcrumbItem,
				);
				link.onclick = () => {
					if (onSwitch) onSwitch(index);
				};
			}

			itemWrapper.appendChild(link);
			this.listContainer.appendChild(itemWrapper);

			if (index < branches.length - 1) {
				this._appendSeparator();
			}
		});

		this._autoScroll();
	}

	_autoScroll() {
		setTimeout(() => {
			const isMobile = window.matchMedia("(max-width: 767px)").matches;

			if (isMobile) {
				const activeLink = this.listContainer.querySelector(
					`.${UI_CLASSES.breadcrumbsLinkActive}`,
				);
				if (!activeLink) return;

				const activeItem =
					activeLink.closest(`.${UI_CLASSES.breadcrumbsItemWrapper}`) ||
					activeLink;
				const containerRect = this.listContainer.getBoundingClientRect();
				const itemRect = activeItem.getBoundingClientRect();

				const containerCenter = containerRect.left + containerRect.width / 2;
				const itemCenter = itemRect.left + itemRect.width / 2;
				const offset = itemCenter - containerCenter;

				this.listContainer.scrollTo({
					left: this.listContainer.scrollLeft + offset,
					behavior: "smooth",
				});
			} else {
				this.listContainer.scrollTo({
					left: this.listContainer.scrollWidth,
					behavior: "smooth",
				});
			}
		}, 50);
	}

	destroy() {
		window.removeEventListener("click", this._handleGlobalClick);
		window.removeEventListener("scroll", this._handleScrollOrResize, {
			capture: true,
		});
		window.removeEventListener("resize", this._handleScrollOrResize);

		this._closeDropdown();
		this.listContainer.innerHTML = "";
	}
}
