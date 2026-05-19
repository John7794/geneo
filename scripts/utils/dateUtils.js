// ./scripts/utils/dateUtils.js

import { COLUMNS } from "../core/dbSchema.js";
import { i18n } from "../core/i18n.js";

const NUM_REGEX = /\d+/;
const YEAR_REGEX = /\d{4}/;
const TIME_REGEX = /(\d{1,2})[:.\-](\d{1,2})/;

let _cachedNow = null;
let _cachedNowTime = 0;

function getNow() {
	const current = Date.now();
	if (!_cachedNow || current - _cachedNowTime > 60000) {
		_cachedNow = new Date();
		_cachedNowTime = current;
	}
	return _cachedNow;
}

export function extractNumber(val) {
	if (!val) return 0;
	const match = String(val).match(NUM_REGEX);
	return match ? parseInt(match[0], 10) : 0;
}

export function extractYear(val) {
	if (!val) return "";
	const match = String(val).match(YEAR_REGEX);
	return match ? match[0] : "";
}

export function getMonthName(mIndex) {
	const rawMonths = i18n.t("time.monthsGenitive");
	const months = Array.isArray(rawMonths) ? rawMonths : [];
	const index = parseInt(mIndex, 10);
	return !Number.isNaN(index) && months[index] ? months[index] : "";
}

export function getBirthData(person) {
	const birthRecord = person._birth;
	if (!birthRecord || !birthRecord[0]) return null;

	return {
		year: birthRecord[0][COLUMNS.birth.year],
		month: birthRecord[0][COLUMNS.birth.month],
		day: birthRecord[0][COLUMNS.birth.day],
	};
}

export function convertJulianToGregorian(d, m, y) {
	const day = parseInt(d, 10);
	const month = parseInt(m, 10);
	const year = parseInt(y, 10);

	if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year))
		return null;

	const century = Math.floor(year / 100);
	const offset = century - Math.floor(century / 4) - 2;

	const date = new Date(Date.UTC(year, month - 1, day + offset));
	date.setUTCFullYear(year);

	return {
		day: date.getUTCDate(),
		month: date.getUTCMonth() + 1,
		year: date.getUTCFullYear(),
	};
}

export function calculateCurrentAge(day, month, year, timeStr = "") {
	const y = parseInt(year, 10);
	if (Number.isNaN(y)) return null;

	const m = parseInt(month, 10);
	const d = parseInt(day, 10);

	const safeMonth = Number.isNaN(m) ? 1 : m;
	const safeDay = Number.isNaN(d) ? 1 : d;

	const now = getNow();
	const currentY = now.getFullYear();
	const currentM = now.getMonth() + 1;
	const currentD = now.getDate();

	let age = currentY - y;

	if (currentM < safeMonth || (currentM === safeMonth && currentD < safeDay)) {
		age--;
	} else if (currentM === safeMonth && currentD === safeDay && timeStr) {
		const timeMatch = String(timeStr).match(TIME_REGEX);
		if (timeMatch) {
			const h = parseInt(timeMatch[1], 10);
			const min = parseInt(timeMatch[2], 10);
			const currentMins = now.getHours() * 60 + now.getMinutes();
			const birthMins = h * 60 + min;

			if (currentMins < birthMins) age--;
		}
	}

	return age >= 0 ? age : null;
}

export function calculateAgeAtDeath(birthRecord, deathRecord) {
	if (!birthRecord || !deathRecord) return null;

	const bYear = extractNumber(birthRecord.year);
	const dYear = extractNumber(deathRecord.year);

	if (!bYear || !dYear) return null;

	let age = dYear - bYear;
	if (age < 0) return null;

	const bMonth = extractNumber(birthRecord.month);
	const dMonth = extractNumber(deathRecord.month);
	const bDay = extractNumber(birthRecord.day);
	const dDay = extractNumber(deathRecord.day);

	if (bMonth > 0 && dMonth > 0) {
		if (
			dMonth < bMonth ||
			(dMonth === bMonth && bDay > 0 && dDay > 0 && dDay < bDay)
		) {
			age--;
		}
	}

	return age;
}

export function getPluralYears(age) {
	if (age === null || age === undefined) return "";

	const rawForms = i18n.t("time.pluralYears");
	const forms = Array.isArray(rawForms) ? rawForms : [];
	if (forms.length === 0) return "років";

	if (i18n.lang === "krl") {
		return age === 1 ? forms[0] || "vuozi" : forms[1] || "vuotta";
	}

	const lastDigit = age % 10;
	const lastTwoDigits = age % 100;

	let index = 2;
	if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
		index = 2;
	} else if (lastDigit === 1) {
		index = 0;
	} else if (lastDigit >= 2 && lastDigit <= 4) {
		index = 1;
	}

	return forms[index] || forms[2] || "років";
}

export function getEventDateDetails(d, m, y, isOldStyle = false) {
	const day = d || "";
	const year = y || "";
	const monthName = getMonthName(m) || m || "";

	const originalDateString = [day, monthName, year].filter(Boolean).join(" ");

	const isOld =
		isOldStyle === true || isOldStyle === "true" || isOldStyle === "1";

	if (d && m && y && isOld) {
		const greg = convertJulianToGregorian(d, m, y);
		if (greg) {
			const gregMonthName = getMonthName(greg.month) || String(greg.month);
			const convertedDateString = [greg.day, gregMonthName, greg.year]
				.filter(Boolean)
				.join(" ");

			return {
				original: originalDateString,
				converted: convertedDateString,
				isDual: true,
			};
		}
	}

	return {
		original: originalDateString,
		converted: null,
		isDual: false,
	};
}
