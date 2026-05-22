// ./scripts/utils/geoUtils.js

import { COLUMNS } from "../core/dbSchema.js";
import { APP_CONFIG } from "../core/appConfig.js";

const DATE_SEP_REGEX = /[./\s\\]/;

// ==========================================
// ПРЕКОМПІЛЯТОР ІНДЕКСІВ (DATA BOOTSTRAPPING)
// ==========================================

export function buildGeoIndexes(DB) {
	const indexes = {
		places: {},
		placeAliases: {},
		cemeteries: {},
		placeHistory: {},
		flagHistory: {},
	};

	if (Array.isArray(DB?.places)) {
		for (let i = 0; i < DB.places.length; i++) {
			const p = DB.places[i];
			const colId = String(p[COLUMNS.places?.id || "place_id"] || "").trim();
			const rawId = String(p.id || "").trim();
			const code = String(p.code || "").trim();

			const primaryId = colId || rawId || code;
			if (!primaryId) continue;

			if (colId) {
				indexes.places[colId] = p;
				indexes.placeAliases[colId] = primaryId;
			}
			if (rawId) {
				indexes.places[rawId] = p;
				indexes.placeAliases[rawId] = primaryId;
			}
			if (code) {
				indexes.places[code] = p;
				indexes.placeAliases[code] = primaryId;
			}
		}
	}

	if (Array.isArray(DB?.cemeteries)) {
		for (let i = 0; i < DB.cemeteries.length; i++) {
			const c = DB.cemeteries[i];
			const id = String(c[COLUMNS.cemeteries?.id || "id"] || "").trim();
			if (id) indexes.cemeteries[id] = c;
		}
	}

	if (Array.isArray(DB?.placeNamesHistory)) {
		const colPlaceId = COLUMNS.placeNamesHistory?.placeId || "place_id";
		const colNameHist = COLUMNS.placeNamesHistory?.nameHist || "name_hist";
		const colStart = COLUMNS.placeNamesHistory?.dateStart || "year_start";
		const colEnd = COLUMNS.placeNamesHistory?.dateEnd || "year_end";

		for (let i = 0; i < DB.placeNamesHistory.length; i++) {
			const row = DB.placeNamesHistory[i];
			const pId = String(row[colPlaceId]).trim();

			if (!pId) continue;

			const targetPrimary = indexes.placeAliases[pId] || pId;

			if (!indexes.placeHistory[targetPrimary]) {
				indexes.placeHistory[targetPrimary] = [];
			}

			indexes.placeHistory[targetPrimary].push({
				name: row[colNameHist],
				start: parseDateToInt(row[colStart], false),
				end: parseDateToInt(row[colEnd], true),
			});
		}
	}

	if (Array.isArray(DB?.flagsHistory)) {
		const colStart =
			COLUMNS.flagsHistory?.dateStart ||
			COLUMNS.flagsHistory?.yearStart ||
			"year_start";
		const colEnd =
			COLUMNS.flagsHistory?.dateEnd ||
			COLUMNS.flagsHistory?.yearEnd ||
			"year_end";
		const colName = COLUMNS.flagsHistory?.name || "admin_name";
		const colFile = COLUMNS.flagsHistory?.file || "flag_file";

		for (let i = 0; i < DB.flagsHistory.length; i++) {
			const row = DB.flagsHistory[i];
			const name = String(row[colName] || "")
				.trim()
				.toLowerCase();

			if (!name) continue;
			if (!indexes.flagHistory[name]) indexes.flagHistory[name] = [];

			indexes.flagHistory[name].push({
				file: String(row[colFile]).trim(),
				start: parseDateToInt(row[colStart], false),
				end: parseDateToInt(row[colEnd], true),
			});
		}
	}

	return indexes;
}

// ==========================================
// ВНУТРІШНІ ХЕЛПЕРИ
// ==========================================

function resolveEntityStatus(rawStatus) {
	const s = String(rawStatus || "")
		.trim()
		.toUpperCase();
	if (s === "PE")
		return { code: "pe", text: "Існує в складі сусіднього населеного пункту" };
	if (s === "NE") return { code: "ne", text: "Не існує" };
	return { code: "active", text: "Існує" };
}

function parseDateToInt(dateVal, isEnd = false) {
	if (!dateVal || String(dateVal).trim() === "") {
		return isEnd ? 99999999 : -99999999;
	}

	// Оптимізоване розщеплення без проміжного replace
	const parts = String(dateVal).trim().split(DATE_SEP_REGEX);

	let y = 0,
		m = isEnd ? 12 : 1,
		d = isEnd ? 31 : 1;

	if (parts.length === 1) {
		y = parseInt(parts[0], 10) || 0;
	} else if (parts.length === 2) {
		y = parseInt(parts[0], 10) || 0;
		m = parseInt(parts[1], 10) || (isEnd ? 12 : 1);
	} else if (parts.length >= 3) {
		let p1 = parseInt(parts[0], 10) || 0;
		let p2 = parseInt(parts[1], 10) || 0;
		let p3 = parseInt(parts[2], 10) || 0;

		if (p1 > 1000) {
			y = p1;
			m = p2;
			d = p3;
		} else if (p3 > 1000) {
			y = p3;
			m = p2;
			d = p1;
		} else {
			y = p1;
			m = p2;
			d = p3;
		}
	}

	if (m < 1) m = 1;
	else if (m > 12) m = 12;
	if (d < 1) d = 1;
	else if (d > 31) d = 31;

	return y * 10000 + m * 100 + d;
}

// ==========================================
// РІВЕНЬ ДОСТУПУ ДО ДАНИХ (DAL)
// ==========================================

export function resolveLocation(rawLocation, DB) {
	if (!rawLocation) return "";
	const val = String(rawLocation).trim();

	if (DB?.geoIndexes?.places && DB.geoIndexes.places[val]) {
		const place = DB.geoIndexes.places[val];
		return (
			place[COLUMNS.places?.nameCurrent || "name_current"] ||
			place[COLUMNS.places?.nameHist || "name_hist"] ||
			place.title ||
			val
		);
	}

	const dbPlaces = DB?.places || DB?.db?.places;
	if (!dbPlaces || !Array.isArray(dbPlaces)) return val;

	for (let i = 0; i < dbPlaces.length; i++) {
		const p = dbPlaces[i];
		if (
			p.id === val ||
			p[COLUMNS.places?.id || "place_id"] === val ||
			p.code === val
		) {
			return (
				p[COLUMNS.places?.nameCurrent || "name_current"] ||
				p[COLUMNS.places?.nameHist || "name_hist"] ||
				p.title ||
				val
			);
		}
	}

	return val;
}

export function resolveCemeteryDetails(cemeteryId, ctx) {
	if (!cemeteryId) return null;
	const cleanId = String(cemeteryId).trim();
	let cemeteryObj = null;

	if (ctx?.geoIndexes?.cemeteries && ctx.geoIndexes.cemeteries[cleanId]) {
		cemeteryObj = ctx.geoIndexes.cemeteries[cleanId];
	} else {
		const dbCem = ctx?.cemeteries || ctx?.db?.cemeteries;
		if (Array.isArray(dbCem)) {
			for (let i = 0; i < dbCem.length; i++) {
				const c = dbCem[i];
				if (String(c[COLUMNS.cemeteries?.id || "id"]).trim() === cleanId) {
					cemeteryObj = c;
					break;
				}
			}
		}
	}

	if (!cemeteryObj) return null;

	const statusData = resolveEntityStatus(
		cemeteryObj[COLUMNS.cemeteries?.status || "status"],
	);

	return {
		name: cemeteryObj[COLUMNS.cemeteries?.name || "name"] || "",
		address: cemeteryObj[COLUMNS.cemeteries?.address || "address"] || "",
		mapUrl: cemeteryObj[COLUMNS.cemeteries?.map || "map"] || "",
		status: statusData.code,
		statusText: statusData.text,
	};
}

export function resolvePlaceDetails(placeId, year, month, day, ctx) {
	const result = {
		rawId: placeId || "",
		nameCurrent: "",
		nameHist: "",
		status: "active",
		statusText: "Існує",
		mapUrl: "",
	};

	const DB = ctx?.db || ctx;
	if (!placeId) return result;
	const cleanPlaceId = String(placeId).trim();
	let placeObj = null;

	if (DB?.geoIndexes?.places && DB.geoIndexes.places[cleanPlaceId]) {
		placeObj = DB.geoIndexes.places[cleanPlaceId];
	} else if (Array.isArray(DB?.places)) {
		for (let i = 0; i < DB.places.length; i++) {
			const p = DB.places[i];
			if (
				p.id === cleanPlaceId ||
				p[COLUMNS.places?.id || "place_id"] === cleanPlaceId ||
				p.code === cleanPlaceId
			) {
				placeObj = p;
				break;
			}
		}
	}

	if (!placeObj) {
		result.nameCurrent = cleanPlaceId;
		return result;
	}

	result.nameCurrent =
		placeObj[COLUMNS.places?.nameCurrent || "name_current"] || "";
	const statusData = resolveEntityStatus(
		placeObj[COLUMNS.places?.status || "status"],
	);
	result.status = statusData.code;
	result.statusText = statusData.text;

	let targetDateInt = null;
	if (year) {
		const y = parseInt(year, 10);
		if (!isNaN(y))
			targetDateInt =
				y * 10000 + (parseInt(month, 10) || 1) * 100 + (parseInt(day, 10) || 1);
	}

	let historyRecords = [];

	if (DB?.geoIndexes?.placeHistory && DB?.geoIndexes?.placeAliases) {
		const primaryId = DB.geoIndexes.placeAliases[cleanPlaceId] || cleanPlaceId;
		const records = DB.geoIndexes.placeHistory[primaryId];
		if (records) historyRecords = records;
	} else if (Array.isArray(DB?.placeNamesHistory)) {
		// Оптимізація пошуку ключів O(1)
		const pKeys = new Set([
			cleanPlaceId,
			String(placeObj[COLUMNS.places?.id || "place_id"] || "").trim(),
			String(placeObj.id || "").trim(),
			String(placeObj.code || "").trim(),
		]);

		const colPlaceId = COLUMNS.placeNamesHistory?.placeId || "place_id";
		const colNameHist = COLUMNS.placeNamesHistory?.nameHist || "name_hist";
		const colStart = COLUMNS.placeNamesHistory?.dateStart || "year_start";
		const colEnd = COLUMNS.placeNamesHistory?.dateEnd || "year_end";

		for (let i = 0; i < DB.placeNamesHistory.length; i++) {
			const h = DB.placeNamesHistory[i];
			const currentId = String(h[colPlaceId] || "").trim();
			if (currentId && pKeys.has(currentId)) {
				historyRecords.push({
					name: h[colNameHist],
					start: parseDateToInt(h[colStart], false),
					end: parseDateToInt(h[colEnd], true),
				});
			}
		}
	}

	if (historyRecords.length > 0) {
		const namesSet = new Set();
		for (let i = 0; i < historyRecords.length; i++) {
			const r = historyRecords[i];
			if (!r.name) continue;
			if (targetDateInt !== null) {
				if (targetDateInt >= r.start && targetDateInt <= r.end) {
					namesSet.add(r.name);
				}
			} else {
				namesSet.add(r.name);
			}
		}
		result.nameHist = Array.from(namesSet).join(", ");
	} else {
		result.nameHist = placeObj[COLUMNS.places?.nameHist || "name_hist"] || "";
	}

	const rawUrl = placeObj[COLUMNS.places?.map || "google_maps_url"];
	if (rawUrl && rawUrl.trim()) {
		const trimmedUrl = rawUrl.trim();
		result.mapUrl = trimmedUrl.startsWith("http")
			? trimmedUrl
			: `https://${trimmedUrl}`;
	}

	return result;
}

export function resolveHistoricalPlaceName(placeId, eventDate, ctx) {
	if (!placeId || !eventDate) return null;

	const targetDateInt = parseDateToInt(eventDate);
	const cleanPlaceId = String(placeId).trim();

	if (ctx?.geoIndexes?.placeHistory && ctx?.geoIndexes?.placeAliases) {
		const primaryId = ctx.geoIndexes.placeAliases[cleanPlaceId] || cleanPlaceId;
		const records = ctx.geoIndexes.placeHistory[primaryId];

		if (records) {
			for (let i = 0; i < records.length; i++) {
				if (
					targetDateInt >= records[i].start &&
					targetDateInt <= records[i].end
				) {
					return records[i].name;
				}
			}
		}
		return null;
	}

	const dbHistory = ctx?.placeNamesHistory || ctx?.db?.placeNamesHistory;
	if (Array.isArray(dbHistory)) {
		let pKeys = new Set([cleanPlaceId]);
		const dbPlaces = ctx?.places || ctx?.db?.places;

		if (Array.isArray(dbPlaces)) {
			for (let i = 0; i < dbPlaces.length; i++) {
				const p = dbPlaces[i];
				if (
					p.id === cleanPlaceId ||
					p[COLUMNS.places?.id || "place_id"] === cleanPlaceId ||
					p.code === cleanPlaceId
				) {
					pKeys = new Set([
						cleanPlaceId,
						String(p[COLUMNS.places?.id || "place_id"] || "").trim(),
						String(p.id || "").trim(),
						String(p.code || "").trim(),
					]);
					break;
				}
			}
		}

		const colPlaceId = COLUMNS.placeNamesHistory?.placeId || "place_id";
		const colStart = COLUMNS.placeNamesHistory?.dateStart || "year_start";
		const colEnd = COLUMNS.placeNamesHistory?.dateEnd || "year_end";
		const colName = COLUMNS.placeNamesHistory?.name || "name_hist";

		for (let i = 0; i < dbHistory.length; i++) {
			const f = dbHistory[i];
			const currentId = String(f[colPlaceId] || "").trim();
			if (!currentId || !pKeys.has(currentId)) continue;

			if (
				targetDateInt >= parseDateToInt(f[colStart], false) &&
				targetDateInt <= parseDateToInt(f[colEnd], true)
			) {
				return f[colName];
			}
		}
	}

	return null;
}

export function resolveFlag(adminName, eventDate, ctx) {
	if (!adminName || !eventDate) return null;

	const cleanName = String(adminName).trim().toLowerCase();
	const targetDateInt = parseDateToInt(eventDate);

	if (ctx?.geoIndexes?.flagHistory && ctx.geoIndexes.flagHistory[cleanName]) {
		const records = ctx.geoIndexes.flagHistory[cleanName];
		for (let i = 0; i < records.length; i++) {
			if (
				targetDateInt >= records[i].start &&
				targetDateInt <= records[i].end
			) {
				let fileName = records[i].file;
				if (!fileName.endsWith(".svg") && !fileName.endsWith(".png")) {
					fileName += APP_CONFIG.flagsExtension || ".svg";
				}
				return `${APP_CONFIG.flagsBasePath || "./assets/icons/flags/"}${fileName}`;
			}
		}
		return null;
	}

	const dbFlags = ctx?.flagsHistory || ctx?.db?.flagsHistory;
	if (Array.isArray(dbFlags)) {
		const colStart =
			COLUMNS.flagsHistory?.dateStart ||
			COLUMNS.flagsHistory?.yearStart ||
			"year_start";
		const colEnd =
			COLUMNS.flagsHistory?.dateEnd ||
			COLUMNS.flagsHistory?.yearEnd ||
			"year_end";
		const colName = COLUMNS.flagsHistory?.name || "admin_name";
		const colFile = COLUMNS.flagsHistory?.file || "flag_file";

		for (let i = 0; i < dbFlags.length; i++) {
			const f = dbFlags[i];
			if (
				String(f[colName] || "")
					.trim()
					.toLowerCase() !== cleanName
			)
				continue;

			if (
				targetDateInt >= parseDateToInt(f[colStart], false) &&
				targetDateInt <= parseDateToInt(f[colEnd], true)
			) {
				let fileName = String(f[colFile]).trim();
				if (!fileName.endsWith(".svg") && !fileName.endsWith(".png")) {
					fileName += APP_CONFIG.flagsExtension || ".svg";
				}
				// Синхронізовано з APP_CONFIG
				return `${APP_CONFIG.flagsBasePath || "./assets/icons/flags/"}${fileName}`;
			}
		}
	}

	return null;
}
