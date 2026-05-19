// ./scripts/components/interaction/personPopupManager.js

import { i18n } from "../../core/i18n.js";
import { UI_CLASSES } from "../../core/uiClasses.js";
import { isFemale, normalizeGender } from "../../utils/genderUtils.js";
import {
	getAvatarUrl,
	getFullName,
	resolveRealId,
} from "../../utils/personUtils.js";
import { convertJulianToGregorian } from "../../utils/dateUtils.js";
import { escapeHtml } from "../../utils/helpers.js";

// ============================================================================
// 1. UTILITY LAYER
// ============================================================================
class DateFormatter {
	static format(rawDateStr, day, month, year, isOldStyle) {
		let d = parseInt(day, 10),
			m = parseInt(month, 10),
			y = parseInt(year, 10);

		if (Number.isNaN(y) && typeof rawDateStr === "string") {
			const parts = rawDateStr.split(/[\.\-\/]/).map((p) => p.trim());
			if (parts.length === 3) {
				d = parseInt(parts[0], 10);
				m = parseInt(parts[1], 10);
				y = parseInt(parts[2], 10);
			} else if (parts.length === 1) {
				y = parseInt(parts[0], 10);
			}
		}

		if (Number.isNaN(y)) return rawDateStr ? String(rawDateStr).trim() : "";

		const isOld =
			isOldStyle === "1" ||
			String(isOldStyle).toLowerCase() === "true" ||
			isOldStyle === true;

		if (isOld && !Number.isNaN(d) && !Number.isNaN(m)) {
			const converted = convertJulianToGregorian(d, m, y);
			if (converted) {
				d = converted.day;
				m = converted.month;
				y = converted.year;
			}
		}

		const strD = !Number.isNaN(d) ? String(d).padStart(2, "0") + "." : "";
		const strM = !Number.isNaN(m) ? String(m).padStart(2, "0") + "." : "";
		return `${strD}${strM}${y}`;
	}
}

// ============================================================================
// 2. DATA ACCESS LAYER (DAO)
// ============================================================================
class PersonDAO {
	static _determineCategory(id) {
		const strId = String(id).trim().toLowerCase();
		// 🔥 ВИПРАВЛЕНО: Жорстка перевірка на префікси бази даних.
		// Блокує хибне спрацьовування на слагах типу "pavlo-..."
		if (strId.startsWith("p::")) return "non_relative";
		if (strId.startsWith("f::")) return "indirect_relative";
		return "direct_relative";
	}

	static normalize(data, engine) {
		const db = engine?.db || {};
		const idStr = String(data.id || "").trim();

		let famRow = data;

		const dbFamilyList = db.familyList || db.FamilyList || db.family_list || [];

		if (engine?._indexes?.family?.has(idStr)) {
			famRow = engine._indexes.family.get(idStr);
		} else if (Array.isArray(dbFamilyList)) {
			famRow =
				dbFamilyList.find((r) => String(r.fam_id || r.id).trim() === idStr) ||
				data;
		}

		const category = this._determineCategory(idStr);
		const isAcquaintance = category === "non_relative";

		const p = {
			id: idStr,
			source: data.source || (isAcquaintance ? "participants" : "familyList"),
			category: category,
			hasProfile: !isAcquaintance && data.hasProfile !== false,

			title: this._extract(famRow, data, "fam_title", "title"),
			name: this._extract(famRow, data, "fam_first_name", "firstName", "name"),
			surname: this._extract(
				famRow,
				data,
				"fam_surname",
				"lastName",
				"surname",
			),
			patronymic: this._extract(famRow, data, "fam_patronymic", "patronymic"),
			gender: normalizeGender(
				this._extract(famRow, data, "fam_gender", "gender"),
			),
			noble: this._extract(
				famRow,
				data,
				"fam_noble_nicknames",
				"nobleNickname",
			),
			origin: this._extract(
				famRow,
				data,
				"fam_origin_place",
				"originPlace",
				"origin",
			),
			coat: this._extract(
				famRow,
				data,
				"fam_coat_of_arms",
				"coatOfArms",
				"coat",
			),
			social: this._extract(
				famRow,
				data,
				"fam_social_status_job",
				"job",
				"socialStatus",
			),
			religion: this._extract(
				famRow,
				data,
				"fam_religion_confession",
				"religionConfession",
				"religion",
			),
			marital: this._extract(
				famRow,
				data,
				"fam_marital_status",
				"maritalStatus",
			),
			role: data.role || "",
			rawPhoto: this._extract(famRow, data, "fam_photo", "photo"),
		};

		const testName = String(p.name).toUpperCase().trim();
		if (testName === p.id.toUpperCase() || testName.startsWith("ID:")) {
			p.name = "";
		}

		p.fullName = getFullName(p);
		if (!p.fullName.trim() && p.id) {
			p.fullName = p.patronymic
				? `[ID: ${p.id}] ${p.patronymic}`
				: `[ID: ${p.id}]`;
		}

		p.photoSrc = getAvatarUrl(p.rawPhoto, isFemale(p.gender));
		p.lifeString = this._buildLifeString(data, famRow, p, engine);

		return p;
	}

	static _extract(dbRow, linkObj, ...keys) {
		if (dbRow !== linkObj) {
			for (const key of keys) {
				if (dbRow[key] && String(dbRow[key]).trim() !== "") {
					return String(dbRow[key]).trim();
				}
			}
		}
		for (const key of keys) {
			if (linkObj[key] && String(linkObj[key]).trim() !== "") {
				return String(linkObj[key]).trim();
			}
		}
		return "";
	}

	static _buildLifeString(data, famRow, p, engine) {
		const db = engine?.db || {};

		const cleanId = String(p.id).split("::").pop();
		let realId = cleanId;
		if (engine?._indexes?.slugs?.has(cleanId)) {
			realId = engine._indexes.slugs.get(cleanId).id || cleanId;
		}

		let bRow =
			Array.isArray(data._birth) && data._birth.length > 0
				? data._birth[0]
				: null;
		if (!bRow && engine?._indexes?.birth?.has(realId)) {
			bRow = engine._indexes.birth.get(realId)[0];
		}
		bRow = bRow || famRow;

		const rawBDate =
			data.birthDate ||
			data.dates?.birth ||
			famRow.fam_birth_date ||
			bRow.birthDate ||
			"";
		const bDay = bRow.day || bRow.b_day || bRow.birth_day;
		const bMonth = bRow.month || bRow.b_month || bRow.birth_month;
		const bYear = bRow.year || bRow.b_year || bRow.birth_year || bRow.fam_year;
		const bOldStyle = bRow.is_old_style || bRow.isOldStyle;

		const bDate =
			DateFormatter.format(rawBDate, bDay, bMonth, bYear, bOldStyle) || "?";

		let bPlaceName = "";
		if (bRow.place_id && db?.places) {
			const pObj = db.places.find(
				(pl) => String(pl.place_id) === String(bRow.place_id),
			);
			if (pObj) bPlaceName = pObj.name_hist || pObj.name_current || "";
		}
		const bPlaceRaw =
			bPlaceName ||
			bRow.place_name ||
			bRow.place ||
			famRow.fam_birth_place ||
			data.birthPlace ||
			"";
		const birthStr = `* ${bDate} ${bPlaceRaw ? `(${bPlaceRaw})` : ""}`.trim();

		let dRow =
			Array.isArray(data._death) && data._death.length > 0
				? data._death[0]
				: null;
		if (!dRow && engine?._indexes?.death?.has(realId)) {
			dRow = engine._indexes.death.get(realId)[0];
		}
		dRow = dRow || famRow;

		const rawDDate =
			data.deathDate ||
			data.dates?.death ||
			famRow.fam_death_date ||
			dRow.deathDate ||
			"";
		const dDay = dRow.day || dRow.d_day || dRow.death_day;
		const dMonth = dRow.month || dRow.d_month || dRow.death_month;
		const dYear = dRow.year || dRow.d_year || dRow.death_year || dRow.fam_year;
		const dOldStyle = dRow.is_old_style || dRow.isOldStyle;

		const dDate = DateFormatter.format(
			rawDDate,
			dDay,
			dMonth,
			dYear,
			dOldStyle,
		);

		let dPlaceName = "";
		if (dRow.place_id && db?.places) {
			const pObj = db.places.find(
				(pl) => String(pl.place_id) === String(dRow.place_id),
			);
			if (pObj) dPlaceName = pObj.name_hist || pObj.name_current || "";
		}
		const dPlaceRaw =
			dPlaceName ||
			dRow.place_name ||
			dRow.place ||
			famRow.fam_death_place ||
			data.deathPlace ||
			"";

		let deathStr = "";
		if (dDate || dPlaceRaw) {
			deathStr =
				`— † ${dDate || "?"} ${dPlaceRaw ? `(${dPlaceRaw})` : ""}`.trim();
		}

		return deathStr ? `${birthStr} ${deathStr}` : birthStr;
	}
}

// ============================================================================
// 3. PRESENTATION LAYER
// ============================================================================
export class PersonPopupManager {
	constructor(callbacks, relManagerInstance) {
		this.onNavigate = callbacks?.onNavigateToProfile;
		this.onRelationshipRequest = callbacks?.onRelationshipRequest;
		this.relManager = relManagerInstance;

		this.popupElement = null;
		this._cachedEngine = null;
		this.isOpen = false;

		this.handleGlobalKeydownCapture =
			this.handleGlobalKeydownCapture.bind(this);
		this.handlePopupClick = this.handlePopupClick.bind(this);

		this.init();
	}

	init() {
		if (document.getElementById("person-popup")) {
			this.popupElement = document.getElementById("person-popup");
		} else {
			const iconClose = escapeHtml(
				UI_CLASSES.icons?.closeLine || "ri-close-line",
			);
			const ariaClose = escapeHtml(i18n.t("ui.close") || "Закрити");

			const html = `
            <div id="person-popup" class="${UI_CLASSES.popupOverlay} ${UI_CLASSES.hidden}" aria-hidden="true">
                <div class="${UI_CLASSES.popupContainer}" role="dialog" aria-modal="true">
                    <button class="${UI_CLASSES.modalClose} ${UI_CLASSES.popupClosePos} ${UI_CLASSES.jsClosePopup}" aria-label="${ariaClose}">
                        <i class="${iconClose}" aria-hidden="true"></i>
                    </button>
                    <div id="popup-header-slot" class="${UI_CLASSES.popupHeader}"></div>
                    <div id="popup-scroll-slot" class="${UI_CLASSES.popupContent}"></div>
                    <div id="popup-footer-slot"></div>
                </div>
            </div>`;
			document.body.insertAdjacentHTML("beforeend", html);
			this.popupElement = document.getElementById("person-popup");
		}

		this.popupElement.addEventListener("click", this.handlePopupClick);
	}

	handlePopupClick(e) {
		if (e.target.closest(`.${UI_CLASSES.jsClosePopup}`)) {
			this.close();
			return;
		}

		const linkBtn = e.target.closest(`.${UI_CLASSES.jsGoRelationship}`);
		if (linkBtn) {
			e.preventDefault();
			const targetId = linkBtn.dataset.id;
			const index = parseInt(linkBtn.dataset.idx, 10) || 0;
			if (this.onRelationshipRequest)
				this.onRelationshipRequest(targetId, index);
			this.close();
			return;
		}

		const profileBtn = e.target.closest(`.${UI_CLASSES.jsGoProfile}`);
		if (profileBtn) {
			e.preventDefault();
			const id = profileBtn.dataset.id;
			if (id && this.onNavigate) this.onNavigate(id);
			this.close();
		}
	}

	handleGlobalKeydownCapture(e) {
		if (this.isOpen) {
			if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
				e.stopImmediatePropagation();
				e.preventDefault();
			}
			if (e.key === "Escape") {
				this.close();
			}
		}
	}

	async getEngine() {
		if (this.relManager && this.relManager.engine)
			return this.relManager.engine;
		if (window.app?.engine) return window.app.engine;
		if (this._cachedEngine) return this._cachedEngine;

		try {
			const api = await import("../../api/api.js");
			this._cachedEngine = await api.fetchAllData();
			return this._cachedEngine;
		} catch (e) {
			console.warn("Збій динамічного завантаження ядра", e);
			return null;
		}
	}

	async open(personData) {
		if (!this.popupElement) return;

		const headerSlot = document.getElementById("popup-header-slot");
		const scrollSlot = document.getElementById("popup-scroll-slot");
		const footerSlot = document.getElementById("popup-footer-slot");

		if (!headerSlot || !scrollSlot || !footerSlot) return;

		const engine = await this.getEngine();
		const p = PersonDAO.normalize(personData, engine);

		headerSlot.innerHTML = this.renderHeader(p);

		// 🔥 Передача об'єкта ядра для розшифровки слагів
		const relationsHTML = this.renderRelationships(p, engine);
		const infoHTML = this.renderGeneralInfo(p);
		const combinedBodyHTML = (relationsHTML + infoHTML).trim();

		scrollSlot.innerHTML = combinedBodyHTML;
		scrollSlot.style.display = combinedBodyHTML === "" ? "none" : "";

		if (p.hasProfile) {
			const btnLabel = escapeHtml(
				i18n.t("ui.viewProfile") || "Перейти до профілю",
			);
			const iconSearch = escapeHtml(
				UI_CLASSES.icons?.userSearch || "ri-user-search-line",
			);

			footerSlot.innerHTML = `
                <div class="${UI_CLASSES.popupFooter}">
                    <button class="${UI_CLASSES.btn} ${UI_CLASSES.btnPrimary} ${UI_CLASSES.w100} ${UI_CLASSES.jsGoProfile}" data-id="${escapeHtml(p.id)}">
                        <i class="${iconSearch}" aria-hidden="true"></i>
                        <span>${btnLabel}</span>
                    </button>
                </div>`;
		} else {
			footerSlot.innerHTML = "";
		}

		this.isOpen = true;

		window.addEventListener("keydown", this.handleGlobalKeydownCapture, {
			capture: true,
		});

		this.popupElement.classList.remove(UI_CLASSES.hidden);
		setTimeout(() => this.popupElement.classList.add(UI_CLASSES.show), 10);
		this.popupElement.setAttribute("aria-hidden", "false");
		document.body.classList.add(UI_CLASSES.noScroll);
		scrollSlot.scrollTop = 0;
	}

	close() {
		if (this.popupElement && this.isOpen) {
			this.isOpen = false;

			window.removeEventListener("keydown", this.handleGlobalKeydownCapture, {
				capture: true,
			});

			this.popupElement.classList.remove(UI_CLASSES.show);
			setTimeout(() => this.popupElement.classList.add(UI_CLASSES.hidden), 250);
			this.popupElement.setAttribute("aria-hidden", "true");
			document.body.classList.remove(UI_CLASSES.noScroll);
		}
	}

	renderHeader(p) {
		const safeRole = escapeHtml(p.role);
		const roleBadge = safeRole
			? `<div class="${UI_CLASSES.popupRoleBadge}">${safeRole}</div>`
			: "";

		const safeNoble = escapeHtml(p.noble);
		const nobleTitle = safeNoble
			? `<div class="popup-noble-title">"${safeNoble}"</div>`
			: "";

		const safeSurname = escapeHtml(p.surname);
		const surnameHTML = safeSurname
			? `<div class="popup-surname">${safeSurname}</div>`
			: "";

		let nameHTML = "";
		const safeName = escapeHtml(p.name);
		const safePatronymic = escapeHtml(p.patronymic);
		const combinedName = `${safeName} ${safePatronymic}`.trim();

		if (combinedName) {
			nameHTML = `<div class="popup-name-patronymic">${combinedName}</div>`;
		}

		const safeDates = escapeHtml(p.lifeString).replace(" — ", "<br>");
		const datesHTML = safeDates
			? `<div class="${UI_CLASSES.popupDates} popup-life-dates">${safeDates}</div>`
			: "";

		return `
            <div class="popup-header-layout">
                <div class="popup-avatar-container">
                    <img src="${escapeHtml(p.photoSrc)}" alt="${escapeHtml(p.fullName)}" class="${UI_CLASSES.popupPhoto}">
                    ${roleBadge}
                </div>
                <div class="popup-person-info">
                    ${surnameHTML}
                    ${nameHTML}
                    ${datesHTML}
                    ${nobleTitle}
                </div>
            </div>
        `;
	}

	renderRelationships(p, engine) {
		if (p.category === "non_relative") return "";

		const urlParams = new URLSearchParams(window.location.search);
		let currentPageId = urlParams.get("id");

		// 🔥 Тотальна резолюція слагів перед передачею в калькулятор
		const realCurrentId = resolveRealId(currentPageId, engine);
		const realTargetId = resolveRealId(p.id, engine);

		if (
			!this.relManager ||
			!realCurrentId ||
			String(realCurrentId) === String(realTargetId)
		)
			return "";

		const scenarios = this.relManager.logic.calculate(
			realCurrentId,
			realTargetId,
		);
		if (!scenarios || scenarios.length === 0) return "";

		const iconArrowRight = escapeHtml(
			UI_CLASSES.icons?.arrowRightLine || "ri-arrow-right-line",
		);

		const listItems = scenarios
			.map((sc, index) => {
				const label = escapeHtml(
					sc.info.targetToIndirect ||
						i18n.t("roles.relative") ||
						"Родич / Родичка",
				);
				let contextHTML = "";

				if (scenarios.length > 1 && sc.root && sc.root.length > 0) {
					const separator = ` ${escapeHtml(i18n.t("common.and") || "та")} `;
					const rootNames = sc.root
						.map((r) => escapeHtml(`${r.name || ""} ${r.surname || ""}`.trim()))
						.filter(Boolean)
						.join(separator);

					if (rootNames) {
						const lineLabel = escapeHtml(
							i18n.t("kinship.lineageLabel") || "Лінія:",
						);
						contextHTML = `<div class="popup-rel-context">${lineLabel} ${rootNames}</div>`;
					}
				}

				const viewLabel = escapeHtml(i18n.t("ui.view") || "перейти");

				return `
            <div class="${UI_CLASSES.popupRow} ${UI_CLASSES.jsGoRelationship} popup-rel-row ${UI_CLASSES.clickable}" data-id="${escapeHtml(realTargetId)}" data-idx="${index}" role="button" tabindex="0">
                <div class="popup-rel-info">
                    <span class="${UI_CLASSES.popupValue} popup-rel-label">${label}</span>
                    ${contextHTML}
                </div>
                <span class="${UI_CLASSES.popupLabel} ${UI_CLASSES.linkText} popup-rel-action">${viewLabel} <i class="${iconArrowRight}" aria-hidden="true"></i></span>
            </div>`;
			})
			.join("");

		const titleText = escapeHtml(
			i18n.t("kinship.kinshipWithYou") || "Спорідненість з Вами",
		);

		return `
            <div class="${UI_CLASSES.popupBody} popup-body-spaced">
                <div class="popup-section-divider">
                    <div class="popup-divider-line"></div>
                    <span class="popup-divider-text">${titleText}</span>
                    <div class="popup-divider-line"></div>
                </div>
                <div class="popup-rel-list">
                    ${listItems}
                </div>
            </div>
        `;
	}

	renderGeneralInfo(p) {
		if (p.category === "non_relative") return "";

		const makeRow = (path, val, fallback) => {
			if (!val) return "";
			const safeLabel = escapeHtml(i18n.t(path) || fallback);
			const safeVal = escapeHtml(val);
			// 🔥 Додано пробіл `&nbsp;` для запобігання злипанню тексту при відсутності CSS Flex Gap
			return `
                <div class="${UI_CLASSES.popupRow}">
                    <span class="${UI_CLASSES.popupLabel}">${safeLabel}:&nbsp;</span>
                    <span class="${UI_CLASSES.popupValue}" style="margin-left: auto; text-align: right;">${safeVal}</span>
                </div>`;
		};

		const rows = [
			makeRow("profile.originPlace", p.origin, "Родове гніздо"),
			makeRow("profile.socialStatus", p.social, "Статус / Професія"),
			makeRow("profile.religion", p.religion, "Віросповідання"),
			makeRow("profile.maritalStatus", p.marital, "Сімейний стан"),
			makeRow("profile.coat", p.coat, "Герб"),
		].join("");

		if (!rows) return "";

		const titleText = escapeHtml(
			i18n.t("profile.generalInfo") || "Загальна інформація",
		);

		return `
            <div class="${UI_CLASSES.popupBody} popup-body-spaced">
                <div class="popup-section-divider">
                    <div class="popup-divider-line"></div>
                    <span class="popup-divider-text">${titleText}</span>
                    <div class="popup-divider-line"></div>
                </div>
                ${rows}
            </div>
        `;
	}

	destroy() {
		if (this.popupElement) {
			this.popupElement.removeEventListener("click", this.handlePopupClick);
		}
		window.removeEventListener("keydown", this.handleGlobalKeydownCapture, {
			capture: true,
		});
		this.isOpen = false;
	}
}
