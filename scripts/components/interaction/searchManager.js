// ./scripts/components/interaction/searchManager.js

import { COLUMNS } from "../../core/dbSchema.js";
import { i18n } from "../../core/i18n.js";
import { UI_CLASSES } from "../../core/uiClasses.js";
import { isFemale } from "../../utils/genderUtils.js";
import { getAvatarUrl, getFullName } from "../../utils/personUtils.js";

export class SearchManager {
	constructor(globalContext, onNavigate, getNavigator) {
		this.context = globalContext;
		this.onNavigate = onNavigate;
		this.getNavigator = getNavigator;

		this.btnOpen = document.getElementById("btn-search");

		this.overlay = document.getElementById("search-overlay");
		this.input = document.getElementById("search-input");
		this.btnClose = document.getElementById("btn-close-search");
		this.resultsList = document.getElementById("search-results-list");
		this.emptyState = document.getElementById("search-empty");
		this.hintState = document.getElementById("search-hint");
		this.statusEl = document.getElementById("search-status");

		this.selectedIndex = -1;
		this.results = [];
		this.searchTimeout = null;

		// Кеш пошукових запитів для усунення навантаження на GC
		this._searchCache = null;

		this._handleGlobalKeydown = this._handleGlobalKeydown.bind(this);

		this.initListeners();
	}

	initListeners() {
		if (this.btnOpen) {
			this.btnOpen.addEventListener("click", () => this.open());
		}

		if (this.btnClose) {
			this.btnClose.addEventListener("click", () => this.close());
		}

		if (this.input) {
			this.input.addEventListener("input", (e) => {
				clearTimeout(this.searchTimeout);
				this.searchTimeout = setTimeout(() => {
					this.handleInput(e.target.value);
				}, 150);
			});

			this.input.addEventListener("keydown", (e) => {
				if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
					e.stopPropagation();
					this.handleKeydown(e);
				}
			});
		}

		document.addEventListener("keydown", this._handleGlobalKeydown);
	}

	_handleGlobalKeydown(e) {
		if ((e.metaKey || e.ctrlKey) && e.code === "KeyK") {
			e.preventDefault();
			this.isOpen ? this.close() : this.open();
		}
	}

	get isOpen() {
		return this.overlay && this.overlay.classList.contains(UI_CLASSES.open);
	}

	open() {
		if (!this.overlay) return;

		this.overlay.classList.add(UI_CLASSES.open);
		this.overlay.classList.remove(UI_CLASSES.hidden);

		this.input.value = "";

		setTimeout(() => {
			if (this.input) this.input.focus();
		}, 50);

		this.resetResults();
		document.body.classList.add(UI_CLASSES.noScroll);
		this.overlay.setAttribute("aria-hidden", "false");
	}

	close() {
		if (!this.overlay || !this.overlay.classList.contains(UI_CLASSES.open))
			return;

		this.overlay.classList.remove(UI_CLASSES.open);
		this.input.blur();
		document.body.classList.remove(UI_CLASSES.noScroll);
		this.overlay.setAttribute("aria-hidden", "true");

		setTimeout(() => {
			this.overlay.classList.add(UI_CLASSES.hidden);
		}, 200);
	}

	resetResults() {
		this.results = [];
		this.renderResults();
		if (this.hintState) this.hintState.classList.remove(UI_CLASSES.hidden);
		if (this.emptyState) this.emptyState.classList.add(UI_CLASSES.hidden);
		if (this.statusEl) this.statusEl.classList.add(UI_CLASSES.hidden);
	}

	_ensureSearchCache(dbBasic) {
		if (this._searchCache) return;

		const cId = COLUMNS.basic?.id || "id";
		const cName = COLUMNS.basic?.name || "name";
		const cSur = COLUMNS.basic?.surname || "surname";
		const cPat = COLUMNS.basic?.patronymic || "patronymic";
		const cSlug = COLUMNS.basic?.slug || "slug";

		const cache = new Array(dbBasic.length);
		for (let i = 0; i < dbBasic.length; i++) {
			const p = dbBasic[i];
			const id = String(p[cId] || "");
			const name = p[cName] || "";
			const sur = p[cSur] || "";
			const pat = p[cPat] || "";
			const slug = p[cSlug] || "";

			const text = (
				id +
				" " +
				name +
				" " +
				sur +
				" " +
				pat +
				" " +
				slug
			).toLowerCase();
			cache[i] = { p, text, id };
		}
		this._searchCache = cache;
	}

	handleInput(query) {
		const queryParts = query.toLowerCase().trim().split(/\s+/).filter(Boolean);

		if (queryParts.length === 0) {
			this.resetResults();
			return;
		}

		if (this.hintState) this.hintState.classList.add(UI_CLASSES.hidden);

		const DB = this.context.db || this.context;
		if (!DB || !Array.isArray(DB.basic)) return;

		this._ensureSearchCache(DB.basic);

		let allowedIdsSet = null;
		if (this.getNavigator) {
			const nav = this.getNavigator();
			if (nav && nav.mode !== "all" && Array.isArray(nav.queue)) {
				allowedIdsSet = new Set(nav.queue);
			}
		}

		const allMatches = [];
		for (let i = 0; i < this._searchCache.length; i++) {
			const item = this._searchCache[i];

			if (allowedIdsSet && !allowedIdsSet.has(item.id)) continue;

			let match = true;
			for (let j = 0; j < queryParts.length; j++) {
				if (item.text.indexOf(queryParts[j]) === -1) {
					match = false;
					break;
				}
			}

			if (match) allMatches.push(item.p);
		}

		const totalCount = allMatches.length;
		if (this.statusEl) {
			if (totalCount > 0) {
				const foundLabel = i18n.t("ui.foundCount") || "Знайдено результатів";
				this.statusEl.textContent = `${foundLabel}: ${totalCount}`;
				this.statusEl.classList.remove(UI_CLASSES.hidden);
			} else {
				this.statusEl.classList.add(UI_CLASSES.hidden);
			}
		}

		this.results = allMatches.slice(0, 20);
		this.selectedIndex = 0;
		this.renderResults();

		if (this.results.length === 0) {
			if (this.emptyState) this.emptyState.classList.remove(UI_CLASSES.hidden);
		} else {
			if (this.emptyState) this.emptyState.classList.add(UI_CLASSES.hidden);
		}
	}

	handleKeydown(e) {
		if (this.results.length === 0) return;

		if (e.key === "ArrowDown") {
			e.preventDefault();
			this.selectedIndex = (this.selectedIndex + 1) % this.results.length;
			this.updateSelection();
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			this.selectedIndex =
				(this.selectedIndex - 1 + this.results.length) % this.results.length;
			this.updateSelection();
		} else if (e.key === "Enter") {
			e.preventDefault();
			if (this.selectedIndex >= 0 && this.results[this.selectedIndex]) {
				this.selectPerson(this.results[this.selectedIndex]);
			}
		}
	}

	updateSelection() {
		if (!this.resultsList) return;
		const items = this.resultsList.querySelectorAll(
			`.${UI_CLASSES.searchItem}`,
		);

		items.forEach((item, index) => {
			if (index === this.selectedIndex) {
				item.classList.add(UI_CLASSES.selected);
				item.scrollIntoView({ block: "nearest" });
			} else {
				item.classList.remove(UI_CLASSES.selected);
			}
		});
	}

	selectPerson(person) {
		const id = person[COLUMNS.basic?.id || "id"];
		if (this.onNavigate) {
			this.onNavigate(id);
		}
		this.close();
	}

	renderResults() {
		if (!this.resultsList) return;
		this.resultsList.innerHTML = "";
		const fragment = document.createDocumentFragment();

		const idLabel = i18n.t("common.id") || "ID";

		this.results.forEach((person, index) => {
			const li = document.createElement("li");
			li.className = UI_CLASSES.searchItem;
			li.setAttribute("role", "option");
			if (index === this.selectedIndex) li.classList.add(UI_CLASSES.selected);

			const fullName =
				getFullName(person) || person[COLUMNS.basic?.name || "name"] || "";
			const photoSrc = getAvatarUrl(
				person[COLUMNS.basic?.photo || "photo"] || person[COLUMNS.basic?.id || "id"],
				isFemale(person[COLUMNS.basic?.gender || "gender"]),
			);
			const safeId = person[COLUMNS.basic?.id || "id"] || "";

			li.innerHTML = `
                <img src="${photoSrc}" class="${UI_CLASSES.searchAvatar}" alt="" loading="lazy">
                <div class="${UI_CLASSES.searchInfo}">
                    <span class="${UI_CLASSES.searchName}"></span>
                    <span class="${UI_CLASSES.searchMeta}">${idLabel}: ${safeId}</span>
                </div>
            `;

			li.querySelector(`.${UI_CLASSES.searchName}`).textContent = fullName;

			li.addEventListener("click", () => this.selectPerson(person));
			li.addEventListener("mouseenter", () => {
				this.selectedIndex = index;
				this.updateSelection();
			});

			fragment.appendChild(li);
		});

		this.resultsList.appendChild(fragment);
	}

	destroy() {
		document.removeEventListener("keydown", this._handleGlobalKeydown);
		this._searchCache = null;
	}
}
