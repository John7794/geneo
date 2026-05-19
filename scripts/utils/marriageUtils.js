// ./scripts/utils/marriageUtils.js

import { COLUMNS } from "../core/dbSchema.js";
import { i18n } from "../core/i18n.js";
import { isFemale, isMale } from "./genderUtils.js";

// --- ПРЕКОМПІЛЬОВАНІ РЕГУЛЯРНІ ВИРАЗИ (O(1) Memory Allocation) ---
const CHURCH_REGEX = /church|religious|церк|вінчан|шлюб|wedding/i;
const CIVIL_REGEX = /civil|raks|zags|рацс|загс|цивіл|розпис|реєстрац/i;
const COHABITATION_REGEX =
	/співмеш|незакон|фактичн|невінчан|concubin|cohabit|civil|сожит|граждан|konkubin|nieformal/i;

export function isChurchRow(row) {
	const hasChurchId = !!row[COLUMNS.marriage?.churchId || "church_id"];
	if (hasChurchId) return true;

	const status = row[COLUMNS.marriage?.unionStatus || "union_status"];
	return status ? CHURCH_REGEX.test(status) : false;
}

export function isCivilRow(row) {
	const hasCivilDetails =
		!!row[COLUMNS.marriage?.civilDetails || "civil_details"];
	if (hasCivilDetails) return true;

	const status = row[COLUMNS.marriage?.unionStatus || "union_status"];
	return status ? CIVIL_REGEX.test(status) : false;
}

/**
 * Зливає цивільні та церковні записи з одним і тим самим партнером в одну подію
 */
export function mergeMarriageRows(rawMarriages) {
	if (!Array.isArray(rawMarriages) || rawMarriages.length === 0) return [];

	const groups = {};
	const noPartnerRows = [];

	const colSpouse = COLUMNS.marriage?.spouseId || "spouse_id";
	const colOrder = COLUMNS.marriage?.order || "order";
	const colYear = COLUMNS.marriage?.year || "year";
	const colCivilDetails = COLUMNS.marriage?.civilDetails || "civil_details";
	const colCivilAddress = COLUMNS.marriage?.civilAddress || "civil_address";
	const colPlaceId = COLUMNS.marriage?.placeId || "place_id";
	const colMonth = COLUMNS.marriage?.month || "month";
	const colDay = COLUMNS.marriage?.day || "day";

	// Групуємо записи за ID партнера
	for (let i = 0; i < rawMarriages.length; i++) {
		const row = rawMarriages[i];
		const pId = row._partner?.id || row[colSpouse];
		if (pId) {
			if (!groups[pId]) groups[pId] = [];
			groups[pId].push(row);
		} else {
			noPartnerRows.push(row);
		}
	}

	const groupKeys = Object.keys(groups);
	const mergedList = new Array(groupKeys.length);

	// Зливаємо групи (один прохід замість множинних .find)
	for (let i = 0; i < groupKeys.length; i++) {
		const group = groups[groupKeys[i]];

		let churchRow = null;
		let civilRow = null;
		const participantsMap = new Map();

		for (let j = 0; j < group.length; j++) {
			const row = group[j];

			if (!churchRow && isChurchRow(row)) churchRow = row;
			if (!civilRow && isCivilRow(row)) civilRow = row;

			if (Array.isArray(row._participants)) {
				for (let p = 0; p < row._participants.length; p++) {
					const participant = row._participants[p];
					const ptId = participant.id || participant.person_id || `temp_${p}`;
					if (!participantsMap.has(ptId)) {
						participantsMap.set(ptId, participant);
					}
				}
			}
		}

		const mainRow = churchRow || civilRow || group[0];
		const result = { ...mainRow };

		const aggregatedParticipants = Array.from(participantsMap.values());
		if (aggregatedParticipants.length > 0) {
			result._participants = aggregatedParticipants;
		}

		if (civilRow && civilRow !== mainRow) {
			result[colCivilDetails] =
				civilRow[colCivilDetails] || civilRow[colPlaceId];
			result[colCivilAddress] = civilRow[colCivilAddress];
			result._civilPlaceId = civilRow[colPlaceId];
			result._civilYear = civilRow[colYear];
			result._civilMonth = civilRow[colMonth];
			result._civilDay = civilRow[colDay];
		}

		mergedList[i] = result;
	}

	const finalArray = mergedList.concat(noPartnerRows);

	for (let i = 0; i < finalArray.length; i++) {
		const item = finalArray[i];
		item._sortOrder = parseInt(item[colOrder] || 0, 10) || 0;
		item._sortYear = parseInt(item[colYear] || 0, 10) || 0;
	}

	finalArray.sort((a, b) => {
		if (a._sortOrder !== b._sortOrder) return a._sortOrder - b._sortOrder;
		return a._sortYear - b._sortYear;
	});

	return finalArray;
}

/**
 * Генерує заголовок запису шлюбу (напр. "Перший шлюб" або "Другий зв'язок").
 */
export function getMarriageTitle(index, statusRaw) {
	const ordinalsRaw = i18n.t("time.ordinalsm");
	const ordinals = Array.isArray(ordinalsRaw) ? ordinalsRaw : [];
	const ordinal = ordinals[index] || "";

	const status = String(statusRaw || "");
	const isCohabitation = COHABITATION_REGEX.test(status);

	const nounKey = isCohabitation ? "events.unionNoun" : "events.marriageNoun";
	const fallbackNoun = isCohabitation ? "зв'язок" : "шлюб";

	const noun = i18n.t(nounKey) || fallbackNoun;

	return ordinal ? `${ordinal} ${noun}`.trim() : noun.trim();
}

/**
 * Визначає правильний лейбл для партнера на основі статі головної особи профілю.
 */
export function getPartnerLabel(person) {
	const gender = person?.gender;

	// 🔥 ВИПРАВЛЕНО: Інверсію ролей ліквідовано. Пряма ідентифікація статі.
	if (isFemale(gender)) return i18n.t("roles.bride") || "Наречена";
	if (isMale(gender)) return i18n.t("roles.groom") || "Наречений";

	return i18n.t("roles.partner") || "Партнер";
}
