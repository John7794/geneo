// ./scripts/components/interaction/eventsManager.js

import { COLUMNS } from "../../core/dbSchema.js";
import { i18n } from "../../core/i18n.js";
import { UI_CLASSES } from "../../core/uiClasses.js";
import { convertJulianToGregorian } from "../../utils/dateUtils.js";
import { findPersonDetails } from "../../utils/personUtils.js";
import { renderPersonTile } from "../ui/shared/personTile.js";
import { escapeHtml } from "../../utils/helpers.js"; // 🔥 Підключено санітайзер

export class EventsManager {
	constructor(globalContext, onNavigate, getNavigator) {
		this.context = globalContext;
		this.getNavigator = getNavigator;

		this.btnOpen = document.getElementById("btn-events");
		this.overlay = document.getElementById("events-overlay");
		this.btnClose = document.getElementById("btn-close-events");
		this.listContainer = document.getElementById("events-list");
		this.emptyState = document.getElementById("events-empty");
		this.badge = document.getElementById("events-badge");
		this.dateDisplay = document.getElementById("current-date-display");

		this.today = new Date();
		this.currentMonth = this.today.getMonth() + 1;
		this.currentDay = this.today.getDate();
		this.foundEvents = [];

		// 🔥 Жорстка прив'язка контексту для безпечного керування пам'яттю
		this._handleListClick = this._handleListClick.bind(this);
		this.open = this.open.bind(this);
		this.close = this.close.bind(this);

		this.init();
	}

	init() {
		if (!this.context) return;

		this.refresh();

		if (this.btnOpen) this.btnOpen.addEventListener("click", this.open);
		if (this.btnClose) this.btnClose.addEventListener("click", this.close);

		if (this.listContainer) {
			this.listContainer.addEventListener("click", this._handleListClick);
		}
	}

	refresh() {
		this.findEvents();
		this.updateButtonState();
		if (this.overlay && !this.overlay.classList.contains(UI_CLASSES.hidden)) {
			this.renderEvents();
		}
	}

	updateButtonState() {
		if (!this.btnOpen) return;
		this.btnOpen.classList.remove(UI_CLASSES.hidden);

		if (this.badge) {
			if (this.foundEvents.length > 0) {
				this.badge.classList.remove(UI_CLASSES.hidden);
				this.badge.classList.add(UI_CLASSES.badgeDot);
			} else {
				this.badge.classList.add(UI_CLASSES.hidden);
				this.badge.classList.remove(UI_CLASSES.badgeDot);
			}
		}
	}

	_handleListClick(e) {
		if (
			e.target.closest(`.${UI_CLASSES.kinshipCardPerson}`) ||
			e.target.closest(`.${UI_CLASSES.kinshipCardActions}`)
		) {
			this.close();
		}
	}

	open() {
		if (!this.overlay) return;
		this.overlay.classList.remove(UI_CLASSES.hidden || "hidden");
		document.body.classList.add(UI_CLASSES.noScroll);

		if (this.dateDisplay) {
			const options = { month: "long", day: "numeric" };
			this.dateDisplay.textContent = this.today.toLocaleDateString(
				i18n.lang,
				options,
			);
		}

		this.renderEvents();

		requestAnimationFrame(() => {
			this.overlay.classList.add("show");
			if (this.btnClose) this.btnClose.focus();
		});
	}

	close() {
		if (!this.overlay) return;
		this.overlay.classList.remove("show");
		document.body.classList.remove(UI_CLASSES.noScroll);

		setTimeout(() => {
			this.overlay.classList.add(UI_CLASSES.hidden || "hidden");
		}, 200);
	}

	findEvents() {
		this.foundEvents = [];
		let allowedIdsSet = null;

		try {
			if (this.getNavigator) {
				const nav = this.getNavigator();
				// 🔥 ОПТИМІЗАЦІЯ O(1): Перетворюємо масив у Set для миттєвого пошуку
				if (nav && nav.mode !== "all" && Array.isArray(nav.queue)) {
					allowedIdsSet = new Set(nav.queue);
				}
			}
		} catch (e) {}

		const DB = this.context.db || this.context;
		if (!DB) return;

		this._processEventsList(
			DB.birth,
			allowedIdsSet,
			"birth",
			COLUMNS.birth,
			(rec) => rec[COLUMNS.birth.personId],
		);
		this._processEventsList(
			DB.death,
			allowedIdsSet,
			"death",
			COLUMNS.death,
			(rec) => rec[COLUMNS.death.personId],
		);
		this._processEventsList(
			DB.marriage,
			allowedIdsSet,
			"marriage",
			COLUMNS.marriage,
			(rec) => [rec[COLUMNS.marriage.personId], rec[COLUMNS.marriage.spouseId]],
		);

		this.foundEvents.sort((a, b) => (a.year || 9999) - (b.year || 9999));
	}

	_processEventsList(sourceList, allowedIdsSet, type, cols, idGetter) {
		if (!sourceList || !Array.isArray(sourceList)) return;

		sourceList.forEach((record) => {
			if (!record) return;

			const idsRaw = idGetter(record);
			if (!idsRaw) return;

			const ids = Array.isArray(idsRaw)
				? idsRaw.map((v) => (v ? String(v) : null))
				: [String(idsRaw)];

			// 🔥 Оптимізована перевірка через Set
			if (allowedIdsSet && !ids.some((id) => id && allowedIdsSet.has(id))) {
				return;
			}

			const d = parseInt(record[cols.day], 10);
			const m = parseInt(record[cols.month], 10);
			const yearVal = parseInt(record[cols.year], 10);
			const isOldStyle = ["1", "true", "+"].includes(
				String(record[cols.calendar] || "").trim(),
			);

			if (isNaN(d) || isNaN(m)) return;

			let gregorian = { day: d, month: m, year: yearVal };

			if (isOldStyle && !isNaN(yearVal)) {
				const converted = convertJulianToGregorian(d, m, yearVal);
				if (converted) gregorian = converted;
			}

			if (
				gregorian.day !== this.currentDay ||
				gregorian.month !== this.currentMonth
			) {
				return;
			}

			const personId = ids[0];
			const spouseId = ids[1];
			const person = personId ? this.getPerson(personId) : null;
			const spouse = spouseId ? this.getPerson(spouseId) : null;

			if (person) {
				this.foundEvents.push({
					type,
					year: yearVal,
					gregorian,
					original: { day: d, month: m, year: yearVal, isOldStyle },
					yearsAgo: !isNaN(gregorian.year)
						? this.today.getFullYear() - gregorian.year
						: null,
					person,
					spouse,
				});
			}
		});
	}

	getPerson(id) {
		if (!this.context || !id) return null;
		return findPersonDetails(id, this.context) || null;
	}

	getFormattedDateString(evt) {
		const getMonthName = (monthNum) => {
			const months = i18n.t("time.monthsGenitive");
			return Array.isArray(months) ? months[monthNum] || "" : "";
		};

		const gMonthName = escapeHtml(getMonthName(evt.gregorian.month));
		let displayStr = `${escapeHtml(evt.gregorian.day)} ${gMonthName} ${escapeHtml(evt.gregorian.year)}`;

		if (evt.original.isOldStyle) {
			const oMonthName = escapeHtml(getMonthName(parseInt(evt.original.month)));
			const oldStyleLabel = escapeHtml(i18n.t("time.oldStyle") || "за ст. ст.");
			displayStr += `<br><span class="${UI_CLASSES.eventDateOldStyle}">${escapeHtml(evt.original.day)} ${oMonthName} ${oldStyleLabel}</span>`;
		}
		return displayStr;
	}

	renderEvents() {
		if (!this.listContainer) return;
		this.listContainer.innerHTML = "";

		if (this.foundEvents.length === 0) {
			if (this.emptyState) this.emptyState.classList.remove(UI_CLASSES.hidden);
			return;
		}
		if (this.emptyState) this.emptyState.classList.add(UI_CLASSES.hidden);

		const fragment = document.createDocumentFragment();

		const groups = {
			birth: {
				items: [],
				title: i18n.t("events.bornGroup") || "Народилися",
				icon: "ri-cake-2-line",
				color: "var(--color-primary)",
			},
			marriage: {
				items: [],
				title: i18n.t("events.marriedGroup") || "Одружилися",
				icon: "ri-hearts-line",
				color: "#db2777",
			},
			death: {
				items: [],
				title: i18n.t("events.diedGroup") || "Померли",
				icon: "ri-candle-line",
				color: "var(--color-text-muted)",
			},
		};

		this.foundEvents.forEach((evt) => {
			if (groups[evt.type]) groups[evt.type].items.push(evt);
		});

		const todayLabel = escapeHtml(i18n.t("events.today") || "Сьогодні");
		const yearsAgoLabel = escapeHtml(i18n.t("events.yearsAgo") || "р. тому");

		Object.values(groups).forEach((group) => {
			if (group.items.length === 0) return;

			const groupHeader = document.createElement("h4");
			// 🔥 Замість інлайн-стилів використовуємо класи
			groupHeader.className = "popup-section-title event-group-header";

			groupHeader.innerHTML = `<i class="${escapeHtml(group.icon)}" style="color: ${escapeHtml(group.color)};" aria-hidden="true"></i> ${escapeHtml(group.title)}`;
			fragment.appendChild(groupHeader);

			group.items.forEach((evt) => {
				const li = document.createElement("li");
				li.className = UI_CLASSES.eventCard;

				const dateStr = this.getFormattedDateString(evt);

				const timeAgoText =
					evt.yearsAgo !== null && evt.yearsAgo > 0
						? `<span class="${UI_CLASSES.eventYears}">${escapeHtml(evt.yearsAgo)} ${yearsAgoLabel}</span>`
						: `<span class="${UI_CLASSES.eventYears}">${todayLabel}</span>`;

				let content = "";

				switch (evt.type) {
					case "birth":
					case "death":
						content = renderPersonTile(evt.person, this.context, "", false);
						break;
					case "marriage":
						const p1 = renderPersonTile(evt.person, this.context, "", false);
						const p2 = evt.spouse
							? renderPersonTile(evt.spouse, this.context, "", false)
							: renderPersonTile(null, this.context, "", true);

						content = `<div class="event-marriage-container">${p1}${p2}</div>`;
						break;
				}

				li.innerHTML = `
                    <div class="${UI_CLASSES.eventHeader}">
                        <div class="${UI_CLASSES.eventHeaderInfo}">
                            <span class="${UI_CLASSES.eventHeaderDate}">${dateStr}</span>
                        </div>
                        ${timeAgoText}
                    </div>
                    <div class="${UI_CLASSES.eventNames}">${content}</div>
                `;
				fragment.appendChild(li);
			});
		});

		this.listContainer.appendChild(fragment);
	}

	// 🔥 Метод для коректного видалення компонента
	destroy() {
		if (this.btnOpen) this.btnOpen.removeEventListener("click", this.open);
		if (this.btnClose) this.btnClose.removeEventListener("click", this.close);

		if (this.listContainer) {
			this.listContainer.removeEventListener("click", this._handleListClick);
		}

		this.foundEvents = [];
		this.context = null;
		this.getNavigator = null;
	}
}
