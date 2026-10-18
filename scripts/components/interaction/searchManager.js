// ./scripts/components/interaction/searchManager.js

import { COLUMNS } from "../../core/dbSchema.js";
import { i18n } from "../../core/i18n.js";
import { UI_CLASSES } from "../../core/uiClasses.js";
import { isFemale } from "../../utils/genderUtils.js";
import { getAvatarUrl, getFullName } from "../../utils/personUtils.js";
import { getCachedDates } from "../../utils/treeUtils.js";

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
		this._allMatches = [];
		this.displayLimit = 20;
		this.searchTimeout = null;

		// Кеш пошукових запитів для усунення навантаження на GC
		this._searchCache = null;
		this._cacheByPersonId = null;

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
		this._allMatches = [];
		this.displayLimit = 20;
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

		const DB = this.context.db || this.context;
		const namesMap = new Map();

		if (DB && Array.isArray(DB.names)) {
			const cPersonId = COLUMNS.names?.personId || "person_id";
			const cBSur = COLUMNS.names?.bSurname || "b_surname";
			const cAltSur = COLUMNS.names?.altSurnames || "alt_surnames";
			const cMSur = COLUMNS.names?.mSurname || "m_surname";
			const cAltFirst = COLUMNS.names?.altFirstNames || "alt_first_names";
			const cBap = COLUMNS.names?.baptismName || "baptism_name";

			for (let i = 0; i < DB.names.length; i++) {
				const n = DB.names[i];
				const pid = String(n[cPersonId] || "").trim();
				if (!pid) continue;
				const parts = [
					n[cBSur],
					n[cAltSur],
					n[cMSur],
					n[cAltFirst],
					n[cBap],
				]
					.filter(Boolean)
					.join(" ");
				if (parts) {
					const existing = namesMap.get(pid);
					namesMap.set(pid, existing ? `${existing} ${parts}` : parts);
				}
			}
		}

		const cache = new Array(dbBasic.length);
		const byPersonId = new Map();

		for (let i = 0; i < dbBasic.length; i++) {
			const p = dbBasic[i];
			const id = String(p[cId] || "");
			const name = p[cName] || "";
			const sur = p[cSur] || "";
			const pat = p[cPat] || "";
			const slug = p[cSlug] || "";

			const extraNames = namesMap.get(id) || "";
			const dates = DB ? getCachedDates(id, DB) : null;
			const bYear = dates?.bYear ? String(dates.bYear) : "";
			const dYear = dates?.dYear ? String(dates.dYear) : "";
			const yearsText = [bYear, dYear].filter(Boolean).join(" ");

			const text = (
				id +
				" " +
				name +
				" " +
				sur +
				" " +
				pat +
				" " +
				slug +
				" " +
				extraNames +
				" " +
				yearsText
			).toLowerCase();

			const item = { p, text, id, bYear, dYear, extraNames };
			cache[i] = item;
			byPersonId.set(id, item);
		}

		this._searchCache = cache;
		this._cacheByPersonId = byPersonId;
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

		this._allMatches = allMatches;
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

		this.displayLimit = 20;
		this.results = allMatches.slice(0, this.displayLimit);
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
				person[COLUMNS.basic?.photo || "photo"],
				isFemale(person[COLUMNS.basic?.gender || "gender"]),
			);
			const safeId = String(person[COLUMNS.basic?.id || "id"] || "");

			const cachedItem = this._cacheByPersonId?.get(safeId);
			const metaParts = [`${idLabel}: ${safeId}`];

			if (cachedItem?.bYear || cachedItem?.dYear) {
				if (cachedItem.bYear && cachedItem.dYear) {
					metaParts.push(`${cachedItem.bYear} – ${cachedItem.dYear}`);
				} else if (cachedItem.bYear) {
					metaParts.push(`* ${cachedItem.bYear}`);
				} else {
					metaParts.push(`† ${cachedItem.dYear}`);
				}
			}

			li.innerHTML = `
                <img src="${photoSrc}" class="${UI_CLASSES.searchAvatar}" alt="" loading="lazy">
                <div class="${UI_CLASSES.searchInfo}">
                    <span class="${UI_CLASSES.searchName}"></span>
                    <span class="${UI_CLASSES.searchMeta}">${metaParts.join(" • ")}</span>
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

		if (this._allMatches && this._allMatches.length > this.results.length) {
			const remaining = this._allMatches.length - this.results.length;
			const moreBtn = document.createElement("button");
			moreBtn.className = "search-show-more-btn";
			moreBtn.type = "button";
			const rawLabel = i18n.t("ui.showMore");
			const showMoreLabel =
				!rawLabel || rawLabel === "ui.showMore" ? "Показати ще" : rawLabel;
			moreBtn.innerHTML = `<span>${showMoreLabel} (+${Math.min(remaining, 20)})</span> <small style="opacity:0.7">залишилося ${remaining}</small>`;
			moreBtn.addEventListener("click", () => {
				this.displayLimit += 20;
				this.results = this._allMatches.slice(0, this.displayLimit);
				this.renderResults();
			});
			fragment.appendChild(moreBtn);
		}

		this.resultsList.appendChild(fragment);
	}

	destroy() {
		document.removeEventListener("keydown", this._handleGlobalKeydown);
		this._searchCache = null;
		this._cacheByPersonId = null;
	}
}

