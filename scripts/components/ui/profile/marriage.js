// ./scripts/components/ui/profile/marriage.js

import { COLUMNS } from "../../../core/dbSchema.js";
import { EVENT_ROLES } from "../../../core/appConfig.js";
import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";

import { resolvePlaceDetails } from "../../../utils/geoUtils.js";
import { resolveChurchDetails } from "../../../utils/churchUtils.js";
import { isFemale, getGenderCode } from "../../../utils/genderUtils.js";
import {
	getMarriageTitle,
	mergeMarriageRows,
	isChurchRow,
	isCivilRow,
} from "../../../utils/marriageUtils.js";

import { formatEventDateHtml } from "../formatters/date.js";
import { formatPlaceHtml } from "../formatters/geo.js";
import { formatChurchHtml } from "../formatters/church.js";

import { makeRow } from "../shared/rows.js";
import { renderParticipantTiles } from "../shared/participants.js";
import { renderPersonTile } from "../shared/personTile.js";

import { hasRealData, escapeHtml } from "../../../utils/helpers.js";

function getMarriageCol(key) {
	return COLUMNS.marriage?.[key] || COLUMNS.marriages?.[key] || key;
}

function renderChurchSection(m, ctx, isMainChurch) {
	if (!isMainChurch) return "";

	const year = m[getMarriageCol("year")];
	const month = m[getMarriageCol("month")];
	const day = m[getMarriageCol("day")];
	const adminDivision = m[getMarriageCol("adminDivision")];
	const isOldStyle = ["1", "true", "+"].includes(
		String(m[getMarriageCol("calendar")] || "").trim(),
	);

	const cDate = formatEventDateHtml(day, month, year, isOldStyle);

	const geo = resolvePlaceDetails(
		m[getMarriageCol("placeId")],
		year,
		month,
		day,
		ctx,
	);

	let exactDate = year ? String(year).trim() : "";
	if (exactDate && month && String(month).trim() !== "") {
		exactDate += `-${String(month).trim().padStart(2, "0")}`;
		if (day && String(day).trim() !== "") {
			exactDate += `-${String(day).trim().padStart(2, "0")}`;
		}
	}

	const cGeoHTML = formatPlaceHtml(geo, adminDivision, exactDate, ctx);

	const churchId = m[getMarriageCol("churchId")];
	let churchDetailsHTML = "";
	let finalAddress = m[getMarriageCol("address")];

	if (churchId) {
		const cData = resolveChurchDetails(churchId, year, ctx);
		if (cData) {
			churchDetailsHTML = formatChurchHtml(cData);
			if (!finalAddress) finalAddress = cData.address;
		}
	} else if (finalAddress) {
		const safeAddress = escapeHtml(finalAddress);
		churchDetailsHTML = `<div>${safeAddress}</div>`;
	}

	const priestRoles = EVENT_ROLES?.priests
		? [...EVENT_ROLES.priests, "priest", "pri"]
		: ["priest", "pri"];
	const priestHTML = renderParticipantTiles(m._participants, priestRoles, ctx);

	const unknownLabel = escapeHtml(i18n.t("common.unknown") || "Невідомо");
	if (
		!hasRealData([cDate, cGeoHTML, churchDetailsHTML, priestHTML], unknownLabel)
	) {
		return "";
	}

	const titleChurch = escapeHtml(
		i18n.t("events.churchMarriage") || "Церковний шлюб",
	);
	const lblDate = escapeHtml(i18n.t("common.date") || "Дата");
	const lblChurch = escapeHtml(i18n.t("taxonomy.church") || "Храм");
	const lblPriest = escapeHtml(i18n.t("roles.marriedBy") || "Вінчав");
	const lblPlace = escapeHtml(i18n.t("common.place") || "Місце");

	const dividerClass = UI_CLASSES.blockDivider || "block-divider";
	const subClass =
		UI_CLASSES.blockDividerSubsection || "block-divider--subsection";

	return `
        <div class="${dividerClass} ${subClass}">
            <span>${titleChurch}</span>
        </div>
        ${makeRow(lblDate, cDate)}
        ${makeRow(lblChurch, churchDetailsHTML)}
        ${makeRow(lblPriest, priestHTML)}
        ${makeRow(lblPlace, cGeoHTML)}
    `;
}

function renderCivilSection(m, ctx, isMainChurch, rawMarriages) {
	const civilName = m[getMarriageCol("civilDetails")];
	const hasCivilData =
		civilName || m._civilPlaceId || (isCivilRow(m) && !isMainChurch);

	if (!hasCivilData) return "";

	const cvYear = m._civilYear || m[getMarriageCol("year")];
	const cvMonth = m._civilMonth || m[getMarriageCol("month")];
	const cvDay = m._civilDay || m[getMarriageCol("day")];

	let adminDivision = "";
	const spouseId = m[getMarriageCol("spouseId")];

	if (isMainChurch && Array.isArray(rawMarriages)) {
		const originalCivilRow = rawMarriages.find(
			(rm) =>
				rm[getMarriageCol("spouseId")] === spouseId &&
				(!rm[getMarriageCol("churchId")] ||
					String(rm[getMarriageCol("churchId")]).trim() === ""),
		);

		if (originalCivilRow) {
			adminDivision = originalCivilRow[getMarriageCol("adminDivision")];
		}
	} else {
		adminDivision = m[getMarriageCol("adminDivision")];
	}

	if (!adminDivision) {
		adminDivision =
			m._civilAdminDivision || m[getMarriageCol("civilAdminDivision")] || "";
	}

	const isOldStyle = ["1", "true", "+"].includes(
		String(m._civilCalendar || m[getMarriageCol("calendar")] || "").trim(),
	);

	const cvDate = formatEventDateHtml(cvDay, cvMonth, cvYear, isOldStyle);

	const geo = resolvePlaceDetails(
		m._civilPlaceId || m[getMarriageCol("placeId")],
		cvYear,
		cvMonth,
		cvDay,
		ctx,
	);

	let exactCvDate = cvYear ? String(cvYear).trim() : "";
	if (exactCvDate && cvMonth && String(cvMonth).trim() !== "") {
		exactCvDate += `-${String(cvMonth).trim().padStart(2, "0")}`;
		if (cvDay && String(cvDay).trim() !== "") {
			exactCvDate += `-${String(cvDay).trim().padStart(2, "0")}`;
		}
	}

	const cvGeoHTML = formatPlaceHtml(geo, adminDivision, exactCvDate, ctx);

	let civilDetailsHTML = "";
	if (civilName) {
		const safeCivilName = escapeHtml(civilName);
		civilDetailsHTML += `<div>${safeCivilName}</div>`;
	}

	const civilAddress = m[getMarriageCol("civilAddress")];
	if (civilAddress) {
		const safeCivilAddress = escapeHtml(civilAddress);
		const metaClass = UI_CLASSES.dataRowMeta || "data-row__meta";
		civilDetailsHTML += `<div class="${metaClass}">${safeCivilAddress}</div>`;
	}

	const unknownLabel = escapeHtml(i18n.t("common.unknown") || "Невідомо");
	if (!hasRealData([cvDate, cvGeoHTML, civilDetailsHTML], unknownLabel)) {
		return "";
	}

	const titleCivil = escapeHtml(
		i18n.t("events.civilMarriage") || "Цивільний шлюб",
	);
	const lblDate = escapeHtml(i18n.t("common.date") || "Дата");
	const lblInst = escapeHtml(i18n.t("taxonomy.institution") || "Установа");
	const lblPlace = escapeHtml(i18n.t("common.place") || "Місце");

	const dividerClass = UI_CLASSES.blockDivider || "block-divider";
	const subClass =
		UI_CLASSES.blockDividerSubsection || "block-divider--subsection";

	return `
        <div class="${dividerClass} ${subClass}">
            <span>${titleCivil}</span>
        </div>
        ${makeRow(lblDate, cvDate)}
        ${makeRow(lblInst, civilDetailsHTML)}
        ${makeRow(lblPlace, cvGeoHTML)}
    `;
}

export function renderMarriageBlock(person) {
	const rawMarriages = person?._marriage;
	if (!Array.isArray(rawMarriages) || rawMarriages.length === 0) return "";

	const ctx = person._context;
	const marriages = mergeMarriageRows(rawMarriages);
	const rowLabel = escapeHtml(i18n.t("roles.partner") || "Партнер");

	const itemsHTML = marriages
		.map((m, index) => {
			const unknownLabel = escapeHtml(i18n.t("common.unknown") || "Невідомо");
			const textMutedClass = UI_CLASSES.textMuted || "text-muted";
			let partnerHTML = `<span class="${textMutedClass}">${unknownLabel}</span>`;

			const currentSpouseId = m._partner ? m._partner.id : null;

			if (m._partner) {
				const mainGenderCode = getGenderCode(person?.gender);
				const partnerGenderCode = getGenderCode(m._partner.gender);
				
				let isFemalePartner;
				if (partnerGenderCode === "f") {
					isFemalePartner = true;
				} else if (partnerGenderCode === "m") {
					isFemalePartner = false;
				} else {
					// Infer from main person
					isFemalePartner = mainGenderCode === "m";
				}
				
				const roleKey = isFemalePartner ? "roles.bride" : "roles.groom";
				const tileRoleLabel = escapeHtml(
					i18n.t(roleKey) || (isFemalePartner ? "Наречена" : "Наречений"),
				);
				partnerHTML = renderPersonTile(m._partner, ctx, tileRoleLabel, false);
			}

			const isMainChurch = isChurchRow(m);
			const churchSectionHTML = renderChurchSection(m, ctx, isMainChurch);
			const civilSectionHTML = renderCivilSection(
				m,
				ctx,
				isMainChurch,
				rawMarriages,
			);

			// 🔥 ПРИМУСОВА АГРЕГАЦІЯ: Збираємо свідків з "сирих" записів за ідентифікатором партнера
			const allParticipants = [];
			rawMarriages.forEach((rm) => {
				const rmSpouseId = rm._partner
					? rm._partner.id
					: rm[getMarriageCol("spouseId")];
				if (
					rmSpouseId === currentSpouseId ||
					(!currentSpouseId && !rmSpouseId)
				) {
					if (Array.isArray(rm._participants)) {
						allParticipants.push(...rm._participants);
					}
				}
			});

			// Формуємо масив з Set (оператор розширення підтримує ітератори)
			const witnessRoles = EVENT_ROLES?.witnesses
				? [...EVENT_ROLES.witnesses, "witness", "wit"]
				: ["witness", "wit"];

			const witnessesHTML = renderParticipantTiles(
				allParticipants,
				witnessRoles,
				ctx,
			);

			let witnessRow = "";
			if (witnessesHTML) {
				const lblWitnesses = escapeHtml(i18n.t("roles.witnesses") || "Свідки");
				witnessRow = makeRow(lblWitnesses, witnessesHTML);
			}

			if (
				!m._partner &&
				!churchSectionHTML &&
				!civilSectionHTML &&
				!witnessesHTML
			) {
				return "";
			}

			let dividerHTML = "";
			if (marriages.length > 1) {
				const unionStatus = m[getMarriageCol("unionStatus")] || "";
				const titleSafe = escapeHtml(getMarriageTitle(index, unionStatus));
				const dividerClass = UI_CLASSES.blockDivider || "block-divider";
				dividerHTML = `<div class="${dividerClass}"><span>${titleSafe}</span></div>`;
			}

			const partnerRowHTML = makeRow(
				rowLabel,
				partnerHTML,
				`${UI_CLASSES.dataRowValueBlock || "data-row__value--block"} marriage-partner-wrapper`,
			);

			return `
            ${dividerHTML}
            ${partnerRowHTML}
            ${churchSectionHTML}
            ${civilSectionHTML}
            ${witnessRow}
        `;
		})
		.join("");

	if (!itemsHTML) return "";

	const sectionTitle = escapeHtml(i18n.t("events.marriage") || "Одруження");
	const blockClass = UI_CLASSES.profileBlock || "profile-block";
	const headerClass = UI_CLASSES.profileBlockHeader || "profile-block__header";
	const bodyClass = UI_CLASSES.profileBlockBody || "profile-block__body";

	return `
    <section class="${blockClass}">
        <h2 class="${headerClass}">${sectionTitle}</h2>
        <div class="${bodyClass}">
            ${itemsHTML}
        </div>
    </section>
    `;
}
