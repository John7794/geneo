// ./scripts/components/interaction/lineageManager.js

import { LineageNavigator } from "../../utils/lineageNavigatorUtils.js";
import { i18n } from "../../core/i18n.js";
import { UI_CLASSES } from "../../core/uiClasses.js";
import { APP_CONFIG } from "../../core/appConfig.js";
import { getAvatarUrl } from "../../utils/personUtils.js";

export class LineageManager {
	constructor(engine, rootId, callbacks) {
		this.engine = engine;
		this.rootId = String(rootId).trim();

		this.onModeChange = callbacks?.onModeChange;
		this.onRefreshEvents = callbacks?.onRefreshEvents;

		// Ядро самостійно звертатиметься до бази через engine.
		// Локальне дублювання мапи видалено.
		this.logic = new LineageNavigator({}, this.rootId, this.engine);

		this.btnToggle = document.getElementById("btn-lineage");
		this.modal = document.getElementById("lineage-modal");
		this.btnClose = document.getElementById("btn-close-lineage");

		// Знаходимо спільний контейнер для делегування подій
		this.optionsContainer = document.querySelector(
			".lineage-options-container",
		); // Припускаємо наявність обгортки
		this.options = document.querySelectorAll(
			`.${UI_CLASSES.lineageOption || "lineage-option"}`,
		);
		this.statsText = document.getElementById("lineage-stats");
		this.searchInput = document.getElementById("search-input");

		// Жорстка прив'язка контексту для безпечного керування пам'яттю
		this._handleOpen = this.openModal.bind(this);
		this._handleClose = this.closeModal.bind(this);
		this._handleOptionClick = this._handleOptionClick.bind(this);

		this.init();
	}

	init() {
		if (this.btnToggle)
			this.btnToggle.addEventListener("click", this._handleOpen);
		if (this.btnClose)
			this.btnClose.addEventListener("click", this._handleClose);

		// Патерн делегування подій замість циклічного bind
		this.options.forEach((opt) => {
			opt.addEventListener("click", this._handleOptionClick);
		});

		this._updateOptionIcons();

		const urlParams = new URLSearchParams(window.location.search);
		const startLineMode = urlParams.get("line");
		if (startLineMode) {
			this.setMode(startLineMode, false);
		}
	}

	_handleOptionClick(e) {
		const opt = e.currentTarget;
		const mode = opt.dataset.mode;

		if (!mode) return;

		this.setMode(mode, true);
		setTimeout(this._handleClose, 150);
	}

	_updateOptionIcons() {
		// Словникова маршрутизація іконок
		const ICON_MAP = {
			paternal: 2,
			father: 2,
			maternal: 3,
			mother: 3,
			paternal_f: 4,
			fatherFather: 4,
			paternal_m: 5,
			fatherMother: 5,
			maternal_f: 6,
			motherFather: 6,
			maternal_m: 7,
			motherMother: 7,
		};

		// Знаходимо ID родичів за їхніми номерами Анентафеля
		const roleIdMap = {};
		if (this.logic && this.logic.ahnentafelMap) {
			for (const [pId, data] of this.logic.ahnentafelMap.entries()) {
				if (data.minNum <= 7) {
					roleIdMap[data.minNum] = pId;
				}
			}
		}

		this.options.forEach((opt) => {
			const mode = opt.dataset.mode;
			const rawText = (opt.innerText || opt.textContent)
				.replace(/[👴👵♂♀]/g, "")
				.trim();

			if (mode === "all") {
				opt.innerHTML = `<i class="ri-group-line" style="margin-right: 8px;" aria-hidden="true"></i><span>${rawText}</span>`;
				return;
			}

			const requiredMinNum = ICON_MAP[mode];
			const isMale = [2, 4, 6].includes(requiredMinNum);
			const fallbackIcon = isMale
				? APP_CONFIG.defaultMale
				: APP_CONFIG.defaultFemale;

			let photoSrc = fallbackIcon;
			const personId = requiredMinNum ? roleIdMap[requiredMinNum] : null;

			if (personId) {
				const pNode =
					(this.engine && this.engine.getPerson ? this.engine.getPerson(personId) : null) ||
					(this.logic && this.logic._basicIndex ? this.logic._basicIndex.get(personId) : null);

				if (pNode) {
					const photoId = pNode.photo_id || pNode.photo || pNode.fam_photo;
					const gender = String(pNode.gender || pNode.fam_gender || "");
					const isFem = gender[0]?.toLowerCase() === "f" || gender[0]?.toLowerCase() === "ж";
					photoSrc = getAvatarUrl(photoId, isFem);
				}
			}

			opt.innerHTML = `
                <img class="${UI_CLASSES.lineageTileAvatar || "lineage-tile-avatar"}" 
                     src="${photoSrc}" 
                     alt="${rawText}" 
                     onerror="this.onerror=null; this.src='${fallbackIcon}';">
                <div class="${UI_CLASSES.lineageTileInfo || "lineage-tile-info"}">
                    <span class="${UI_CLASSES.lineageTileName || "lineage-tile-name"}">${rawText}</span>
                </div>
            `;
			opt.style.padding = ""; // Обнулення інлайн-стилів
		});
	}

	setMode(mode, updateUrl = true) {
		this.logic.setMode(mode);

		const activeClass = UI_CLASSES.active || "active";
		this.options.forEach((o) => {
			o.classList.toggle(activeClass, o.dataset.mode === mode);
		});

		if (updateUrl) {
			const currentUrl = new URL(window.location);
			if (mode === "all") {
				currentUrl.searchParams.delete("line");
			} else {
				currentUrl.searchParams.set("line", mode);
			}
			window.history.pushState({}, "", currentUrl);
		}

		this._updateSearchPlaceholder(mode);
		this._updateStats();

		if (this.onModeChange) this.onModeChange(this.logic.queue);
		if (this.onRefreshEvents) this.onRefreshEvents();
	}

	_updateSearchPlaceholder(mode) {
		if (!this.searchInput) return;
		const baseSearchText = i18n.t("ui.searchPlaceholder") || "Пошук";

		if (mode === "all") {
			this.searchInput.placeholder = `${baseSearchText}...`;
		} else {
			const activeOpt = Array.from(this.options).find(
				(o) => o.dataset.mode === mode,
			);
			let modeLabel = mode;

			if (activeOpt) {
				const nameSpan = activeOpt.querySelector(
					`.${UI_CLASSES.lineageTileName || "lineage-tile-name"}`,
				);
				modeLabel = nameSpan
					? nameSpan.innerText.trim()
					: activeOpt.innerText.trim();
			}
			this.searchInput.placeholder = `${baseSearchText} (${modeLabel})...`;
		}
	}

	_updateStats() {
		if (this.statsText) {
			const modeKey = this.logic.mode;
			const modeName = i18n.t(`kinship.${modeKey}`) || modeKey;
			const prefix = i18n.t("kinship.statsPrefix") || "Режим";
			const foundStr = i18n.t("kinship.statsFound") || "Знайдено";

			this.statsText.innerHTML = `${prefix}: "${modeName}".<br>${foundStr}: ${this.logic.queue.length}`;
		}
	}

	openModal() {
		if (this.modal) {
			this.modal.classList.add("show", "open");
			this.modal.classList.remove("hidden");
			this._updateStats();
			document.body.classList.add(UI_CLASSES.noScroll || "no-scroll");
			this.modal.setAttribute("aria-hidden", "false");
		}
	}

	closeModal() {
		if (
			this.modal &&
			(this.modal.classList.contains(UI_CLASSES.open || "open") ||
				this.modal.classList.contains("show"))
		) {
			this.modal.classList.remove(UI_CLASSES.open || "open", "show");
			document.body.classList.remove(UI_CLASSES.noScroll || "no-scroll");
			this.modal.setAttribute("aria-hidden", "true");

			setTimeout(() => {
				this.modal.classList.add("hidden");
			}, 200);
		}
	}

	get queue() {
		return this.logic.queue;
	}

	get mode() {
		return this.logic.mode;
	}

	destroy() {
		if (this.btnToggle)
			this.btnToggle.removeEventListener("click", this._handleOpen);
		if (this.btnClose)
			this.btnClose.removeEventListener("click", this._handleClose);

		this.options.forEach((opt) => {
			opt.removeEventListener("click", this._handleOptionClick);
		});

		this.logic = null;
		this.engine = null;
	}
}
