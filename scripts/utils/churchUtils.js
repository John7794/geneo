// ./scripts/utils/churchUtils.js

import { COLUMNS } from "../core/dbSchema.js";
import { i18n } from "../core/i18n.js";

// Прекомпіляція регулярних виразів для O(1) доступу
const URL_REGEX = /^(https?|ftp):\/\//i;
const SPLIT_HIERARCHY_REGEX = /[/,]/;

/**
 * Хелпер для парсингу ієрархії без зайвих алокацій пам'яті
 */
function parseHierarchy(rawString) {
	if (!rawString) return [];
	const parts = String(rawString).split(SPLIT_HIERARCHY_REGEX);
	const result = [];
	for (let i = 0; i < parts.length; i++) {
		const trimmed = parts[i].trim();
		if (trimmed) result.push({ name: trimmed });
	}
	return result;
}

/**
 * Уніфікований екстрактор історичних періодів.
 * Ліквідує дублювання коду (DRY).
 */
function parseHistoryPeriod(adm) {
	const startStr = adm[COLUMNS.churchAdminHistory.dateStart] || "0000";
	const endStr = adm[COLUMNS.churchAdminHistory.dateEnd] || "9999";
	return {
		start: parseInt(startStr.substring(0, 4), 10) || 0,
		end: parseInt(endStr.substring(0, 4), 10) || 9999,
		hierarchy: parseHierarchy(adm[COLUMNS.churchAdminHistory.adminDivision]),
	};
}

/**
 * ПЕРЕДОБРОБКА ДАНИХ: Створює індекси для церков та їх історичної адміністративної приналежності.
 * Викликається одноразово під час Bootstrap-фази рушія бази даних.
 */
export function buildChurchIndexes(churchesRaw, adminHistoryRaw) {
	const indexes = {
		churches: {},
		history: {},
	};

	if (Array.isArray(churchesRaw)) {
		for (let i = 0; i < churchesRaw.length; i++) {
			const church = churchesRaw[i];
			const id = String(church[COLUMNS.churches.id]).trim();
			if (id) indexes.churches[id] = church;
		}
	}

	if (Array.isArray(adminHistoryRaw)) {
		for (let i = 0; i < adminHistoryRaw.length; i++) {
			const adm = adminHistoryRaw[i];
			const cId = String(adm[COLUMNS.churchAdminHistory.churchId]).trim();

			if (!cId) continue;
			if (!indexes.history[cId]) indexes.history[cId] = [];

			indexes.history[cId].push(parseHistoryPeriod(adm));
		}
	}

	return indexes;
}

/**
 * РІВЕНЬ ДАНИХ: Вилучення атрибутів парафії з використанням прекомпільованих індексів.
 */
export function resolveChurchDetails(churchId, year, ctx) {
	if (!churchId) return null;

	const cleanId = String(churchId).trim();
	let churchObj = null;
	let hierarchy = [];

	const numYear = year ? parseInt(year, 10) : NaN;

	// 1. Отримання базового об'єкта церкви
	if (ctx?.churchIndexes?.churches) {
		churchObj = ctx.churchIndexes.churches[cleanId];
	} else if (ctx?.churchesLookup && ctx.churchesLookup[cleanId]) {
		churchObj = ctx.churchesLookup[cleanId];
	} else if (Array.isArray(ctx?.churches)) {
		// Оптимізований фолбек
		for (let i = 0; i < ctx.churches.length; i++) {
			if (String(ctx.churches[i][COLUMNS.churches.id]).trim() === cleanId) {
				churchObj = ctx.churches[i];
				break;
			}
		}
	}

	if (!churchObj) return null;

	// 2. Визначення історичної ієрархії (без надлишкових алокацій пам'яті)
	if (!isNaN(numYear)) {
		if (ctx?.churchIndexes?.history) {
			const historyRecords = ctx.churchIndexes.history[cleanId];
			if (historyRecords) {
				for (let i = 0; i < historyRecords.length; i++) {
					const record = historyRecords[i];
					if (numYear >= record.start && numYear <= record.end) {
						hierarchy = record.hierarchy;
						break;
					}
				}
			}
		} else if (Array.isArray(ctx?.churchAdminHistory)) {
			// Inline-фолбек. Сканує базу і зупиняється на першому збігу.
			// Унеможливлює створення тимчасових масивів historyRecords.
			for (let i = 0; i < ctx.churchAdminHistory.length; i++) {
				const adm = ctx.churchAdminHistory[i];
				if (
					String(adm[COLUMNS.churchAdminHistory.churchId]).trim() === cleanId
				) {
					const period = parseHistoryPeriod(adm);
					if (numYear >= period.start && numYear <= period.end) {
						hierarchy = period.hierarchy;
						break;
					}
				}
			}
		}
	}

	// 3. Форматування атрибутів
	const name = churchObj[COLUMNS.churches.name] || "";
	const confessionCode = String(
		churchObj[COLUMNS.churches.confession] || "",
	).trim();

	const rawVal = String(churchObj[COLUMNS.churches.status] || "")
		.trim()
		.toUpperCase();
	let rawStatus = "Active";
	let fallbackLabel = "Існує";

	if (rawVal === "PE") {
		rawStatus = "Pe";
		fallbackLabel = "Існує в складі сусіднього населеного пункту";
	} else if (rawVal === "NE") {
		rawStatus = "Ne";
		fallbackLabel = "Не існує";
	}

	const statusLabel = i18n.t(`church.status${rawStatus}`) || fallbackLabel;

	let cleanUrl = null;
	const rawUrl = churchObj[COLUMNS.churches.map];
	if (rawUrl && rawUrl.trim() !== "") {
		const trimmedUrl = rawUrl.trim();
		cleanUrl = URL_REGEX.test(trimmedUrl)
			? trimmedUrl
			: `https://${trimmedUrl}`;
	}

	const refAddress = churchObj[COLUMNS.churches.address] || "";

	const confessionName = confessionCode
		? i18n.t(`confession.${confessionCode.toLowerCase()}`) || confessionCode
		: "";

	const religionName = confessionCode
		? i18n.t(`religion.${confessionCode.toLowerCase()}`) || ""
		: "";

	return {
		name,
		hierarchy,
		religion: religionName,
		confession: confessionName,
		status: statusLabel,
		statusCode: rawStatus.toLowerCase(),
		url: cleanUrl,
		address: refAddress,
	};
}
