// ./scripts/services/gedcom/gedcomDateParser.js

/**
 * Парсер та форматер генеалогічних дат за стандартами GEDCOM 5.5.1 та 7.0
 * з підтримкою юліанського календаря (старий стиль) та української локалізації.
 */

const MONTH_MAP_TO_NUM = {
	// GEDCOM стандарт (англ.)
	JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
	JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
	// Українські скорочення
	СІЧ: "01", ЛЮТ: "02", БЕР: "03", КВІ: "04", ТРА: "05", ЧЕР: "06",
	ЛИП: "07", СЕР: "08", ВЕР: "09", ЖОВ: "10", ЛИС: "11", ГРУ: "12",
	// Загальновживані цифрові або повні
	"1": "01", "2": "02", "3": "03", "4": "04", "5": "05", "6": "06",
	"7": "07", "8": "08", "9": "09", "10": "10", "11": "11", "12": "12",
};

const MONTH_NUM_TO_GEDCOM = [
	"", "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
	"JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

/**
 * Парсить окрему точну або часткову дату (наприклад "15 MAY 1880", "MAY 1880", "1880")
 */
function parseSingleDate(tokenStr) {
	if (!tokenStr) return { day: "", month: "", year: "" };

	const parts = tokenStr.trim().split(/\s+/);
	let day = "";
	let month = "";
	let year = "";

	if (parts.length === 3) {
		// Day Month Year (e.g. 15 MAY 1880)
		day = parts[0].replace(/\D/g, "");
		month = MONTH_MAP_TO_NUM[parts[1].toUpperCase()] || "";
		year = parts[2].replace(/\D/g, "");
	} else if (parts.length === 2) {
		// Month Year (e.g. MAY 1880) or Day Month
		const p0Upper = parts[0].toUpperCase();
		const p1Upper = parts[1].toUpperCase();

		if (MONTH_MAP_TO_NUM[p0Upper]) {
			month = MONTH_MAP_TO_NUM[p0Upper];
			year = parts[1].replace(/\D/g, "");
		} else if (MONTH_MAP_TO_NUM[p1Upper]) {
			day = parts[0].replace(/\D/g, "");
			month = MONTH_MAP_TO_NUM[p1Upper];
		} else {
			// Дві цифри (наприклад "05 1880")
			if (parseInt(parts[0], 10) <= 12) {
				month = parts[0].padStart(2, "0");
				year = parts[1];
			} else {
				day = parts[0];
				month = parts[1].padStart(2, "0");
			}
		}
	} else if (parts.length === 1) {
		const val = parts[0].trim();
		if (/^\d{4}$/.test(val)) {
			year = val;
		} else if (MONTH_MAP_TO_NUM[val.toUpperCase()]) {
			month = MONTH_MAP_TO_NUM[val.toUpperCase()];
		}
	}

	return {
		day: day ? String(parseInt(day, 10)) : "",
		month: month ? String(parseInt(month, 10)).padStart(2, "0") : "",
		year: year || "",
	};
}

/**
 * Парсить повний рядок дати з GEDCOM тегу DATE
 * Підтримує префікси: ABT, CAL, EST, BEF, AFT, BET ... AND, FROM ... TO, @#DJULIAN@
 */
export function parseGedcomDate(rawStr) {
	if (!rawStr || typeof rawStr !== "string") {
		return {
			raw: "",
			day: "",
			month: "",
			year: "",
			yearTo: "",
			isOldStyle: false,
			dateSort: "",
			dateType: "exact",
		};
	}

	let str = rawStr.trim();
	let isOldStyle = false;
	let dateType = "exact";
	let yearTo = "";

	// 1. Перевірка календаря (Юліанський календар)
	if (str.includes("@#DJULIAN@")) {
		isOldStyle = true;
		str = str.replace(/@#DJULIAN@/g, "").trim();
	} else if (str.includes("@#DGREGORIAN@")) {
		isOldStyle = false;
		str = str.replace(/@#DGREGORIAN@/g, "").trim();
	}

	// 2. Визначення типу дати за префіксом
	const upper = str.toUpperCase();

	if (upper.startsWith("ABT ") || upper.startsWith("ABOUT ")) {
		dateType = "about";
		str = str.replace(/^(ABT|ABOUT)\s+/i, "");
	} else if (upper.startsWith("CAL ") || upper.startsWith("CALCULATED ")) {
		dateType = "calculated";
		str = str.replace(/^(CAL|CALCULATED)\s+/i, "");
	} else if (upper.startsWith("EST ") || upper.startsWith("ESTIMATED ")) {
		dateType = "estimated";
		str = str.replace(/^(EST|ESTIMATED)\s+/i, "");
	} else if (upper.startsWith("BEF ") || upper.startsWith("BEFORE ")) {
		dateType = "before";
		str = str.replace(/^(BEF|BEFORE)\s+/i, "");
	} else if (upper.startsWith("AFT ") || upper.startsWith("AFTER ")) {
		dateType = "after";
		str = str.replace(/^(AFT|AFTER)\s+/i, "");
	} else if (upper.startsWith("BET ") && upper.includes(" AND ")) {
		dateType = "range";
		const match = str.match(/^BET\s+(.+?)\s+AND\s+(.+)$/i);
		if (match) {
			const d1 = parseSingleDate(match[1]);
			const d2 = parseSingleDate(match[2]);
			yearTo = d2.year || "";
			const sortY = d1.year || d2.year || "0000";
			const sortM = (d1.month || "00").padStart(2, "0");
			const sortD = (d1.day || "00").padStart(2, "0");
			return {
				raw: rawStr,
				day: d1.day,
				month: d1.month,
				year: d1.year,
				yearTo,
				isOldStyle,
				dateSort: sortY !== "0000" ? `${sortY}-${sortM}-${sortD}` : "",
				dateType,
			};
		}
	} else if (upper.startsWith("FROM ") && upper.includes(" TO ")) {
		dateType = "range";
		const match = str.match(/^FROM\s+(.+?)\s+TO\s+(.+)$/i);
		if (match) {
			const d1 = parseSingleDate(match[1]);
			const d2 = parseSingleDate(match[2]);
			yearTo = d2.year || "";
			const sortY = d1.year || d2.year || "0000";
			return {
				raw: rawStr,
				day: d1.day,
				month: d1.month,
				year: d1.year,
				yearTo,
				isOldStyle,
				dateSort: sortY !== "0000" ? `${sortY}-00-00` : "",
				dateType,
			};
		}
	}

	const single = parseSingleDate(str);
	const sortYear = single.year ? single.year.padStart(4, "0") : "0000";
	const sortMonth = single.month ? single.month.padStart(2, "0") : "00";
	const sortDay = single.day ? single.day.padStart(2, "0") : "00";
	const dateSort = sortYear !== "0000" ? `${sortYear}-${sortMonth}-${sortDay}` : "";

	return {
		raw: rawStr,
		day: single.day,
		month: single.month,
		year: single.year,
		yearTo,
		isOldStyle,
		dateSort,
		dateType,
	};
}

/**
 * Форматує дату Geneo у валідний рядок GEDCOM DATE
 */
export function formatToGedcomDate({
	day = "",
	month = "",
	year = "",
	isOldStyle = false,
	dateType = "exact",
	yearTo = "",
} = {}) {
	const d = day ? String(parseInt(day, 10)) : "";
	const mNum = month ? parseInt(month, 10) : 0;
	const m = (mNum >= 1 && mNum <= 12) ? MONTH_NUM_TO_GEDCOM[mNum] : "";
	const y = year ? String(year).trim() : "";

	if (!y && !m && !d) return "";

	let dateBody = "";
	if (d && m && y) {
		dateBody = `${d} ${m} ${y}`;
	} else if (m && y) {
		dateBody = `${m} ${y}`;
	} else if (y) {
		dateBody = y;
	}

	let prefix = "";
	if (dateType === "about") prefix = "ABT ";
	else if (dateType === "calculated") prefix = "CAL ";
	else if (dateType === "estimated") prefix = "EST ";
	else if (dateType === "before") prefix = "BEF ";
	else if (dateType === "after") prefix = "AFT ";
	else if (dateType === "range" && yearTo) {
		return `${isOldStyle ? "@#DJULIAN@ " : ""}BET ${dateBody} AND ${yearTo}`;
	}

	const calPrefix = isOldStyle ? "@#DJULIAN@ " : "";
	return `${calPrefix}${prefix}${dateBody}`.trim();
}
