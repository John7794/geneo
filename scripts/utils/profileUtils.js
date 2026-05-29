// ./scripts/utils/profileUtils.js

import { COLUMNS } from "../core/dbSchema.js";
import { findPersonDetails, getProfileUrl } from "./personUtils.js";
import { extractYear } from "./dateUtils.js";

// --- BASIC HELPERS ---

const SPACE_REGEX = /\s+/;
export const parseKinshipIds = (val) =>
	val ? String(val).trim().split(SPACE_REGEX) : [];

const getYear = (dateStr) => {
	const yStr = extractYear(dateStr);
	return yStr ? parseInt(yStr, 10) : 9999;
};

export const enrich = (ids, context, roleGetter) => {
	if (!ids) return [];
	const list = Array.isArray(ids) ? ids : [ids];

	const uniqueIds = [];
	const seen = new Set();
	for (let i = 0; i < list.length; i++) {
		const id = list[i];
		if (id && !seen.has(id)) {
			seen.add(id);
			uniqueIds.push(id);
		}
	}

	const enriched = [];
	for (let i = 0; i < uniqueIds.length; i++) {
		const details = findPersonDetails(uniqueIds[i], context);
		if (!details || details.source === "unknown") continue;

		const role = roleGetter ? roleGetter(details) : "";
		enriched.push({
			...details,
			role,
			_sortYear: getYear(details.birthDate),
		});
	}

	return enriched.sort((a, b) => a._sortYear - b._sortYear);
};

// --- EVENT HELPERS ---

export const getParticipants = (eventId, eventType, allData, context) => {
	const DB = allData?.db || allData || {};
	if (!eventId || !DB.events) return [];

	const allEventLinks = allData._indexes?.events?.get(String(eventId).trim());
	if (!allEventLinks || allEventLinks.length === 0) return [];

	const targetType = String(eventType).trim().toLowerCase();
	const result = [];

	for (let i = 0; i < allEventLinks.length; i++) {
		const linkRow = allEventLinks[i];

		if (
			String(linkRow[COLUMNS.events?.eventType || "event_type"] || "")
				.trim()
				.toLowerCase() !== targetType
		) {
			continue;
		}

		const personId = linkRow[COLUMNS.events?.personId || "person_id"];
		const roleCode = linkRow[COLUMNS.events?.role || "role"];
		let details = findPersonDetails(personId, context);

		if (details.source === "unknown") {
			details = {
				id: personId,
				name: personId,
				surname: "",
				gender: "u",
				source: "event_link_only",
				hasProfile: false,
			};
		}

		result.push({
			...details,
			id: personId,
			role: roleCode,
			isRelative:
				details.source === "basic" || details.source === "family_list",
			_linkedProfile: details.hasProfile
				? { id: details.id, url: getProfileUrl(details.id, context) }
				: null,
		});
	}

	return result;
};

// --- RECORD HELPERS ---

export const processRecords = (records, targetId, DB) => {
	if (!Array.isArray(records) || records.length === 0) return [];

	const cleanTargetId = String(targetId).trim();
	const personIdsCol = COLUMNS.records?.personIds || "persons_ids";
	const idCol = COLUMNS.records?.id || "record_id";
	const yearCol = COLUMNS.records?.year || "year";
	const archiveIdCol = COLUMNS.records?.archiveId || "archive_id";
	const archiveRefCol = COLUMNS.records?.archiveRef || "archive_ref";

	// 1. Знайти всі record_id, до яких прив'язана дана особа (явна роль)
	const personRecordRoles = new Map();

	for (let i = 0; i < records.length; i++) {
		const record = records[i];
		const rawLinks = record[personIdsCol];

		let foundRole = null;
		
		if (rawLinks) {
			const linksStr = String(rawLinks);
			let searchIdx = 0;
			while (searchIdx < linksStr.length) {
				let semiIdx = linksStr.indexOf(";", searchIdx);
				if (semiIdx === -1) semiIdx = linksStr.length;

				const pairStr = linksStr.substring(searchIdx, semiIdx).trim();
				const colonIdx = pairStr.indexOf(":");

				if (colonIdx !== -1) {
					const pId = pairStr.substring(0, colonIdx).trim();
					if (pId === cleanTargetId) {
						foundRole = pairStr.substring(colonIdx + 1).trim() || "Учасник";
						break;
					}
				} else {
					if (pairStr === cleanTargetId) {
						foundRole = "Учасник";
						break;
					}
				}
				searchIdx = semiIdx + 1;
			}
		}

		if (foundRole === null) {
			const recIdStr = String(record[idCol] || record.id || "").trim();
			// Підтримка формату rec_ID або rec_ID_...
			if (recIdStr === `rec_${cleanTargetId}` || recIdStr.startsWith(`rec_${cleanTargetId}_`)) {
				foundRole = "Учасник";
			}
		}

		if (foundRole !== null) {
			// Якщо record_id пустий, генеруємо унікальний fallback, щоб не сплутати з іншими порожніми
			const recId = String(record[idCol] || record.id || `gen_fallback_${i}`).trim();
			if (!personRecordRoles.has(recId)) {
				personRecordRoles.set(recId, foundRole);
			}
		}
	}

	const result = [];

	const archiveIndex = new Map();
	if (Array.isArray(DB?.archives)) {
		const aidCol = COLUMNS.archives?.id || "id";
		for (let i = 0; i < DB.archives.length; i++) {
			const a = DB.archives[i];
			archiveIndex.set(String(a[aidCol]).trim(), a);
		}
	}

	// 2. Зібрати всі рядки, які відповідають знайденим record_id. 
	// Це підтягне заголовні рядки з картинками, навіть якщо в них немає persons_id,
	// за умови що вони містять 5 важливих полів (record_id і тд).
	for (let i = 0; i < records.length; i++) {
		const record = records[i];
		const recId = String(record[idCol] || record.id || `gen_fallback_${i}`).trim();
		const roleForPerson = personRecordRoles.get(recId);

		if (roleForPerson !== undefined) {
			const archiveId = String(record[archiveIdCol] || "").trim();
			const archiveObj = archiveIndex.get(archiveId) || null;

			let archiveInfo = archiveObj
				? archiveObj[COLUMNS.archives?.name || "name"] || ""
				: "";

			const refData = record[archiveRefCol];
			if (refData) {
				archiveInfo += archiveInfo ? `, ${refData}` : refData;
			}

			result.push({
				...record,
				_role: roleForPerson,
				_archive: archiveObj,
				_archiveDisplay: archiveInfo,
				_sortYear: parseInt(record[yearCol], 10) || 0,
			});
		}
	}

	return result.sort((a, b) => a._sortYear - b._sortYear);
};

// --- INDEXING HELPER ---

export function ensureIndexes(allData) {
	if (allData._indexes) return;

	const DB = allData.db || allData || {};
	allData._indexes = {};

	console.log("⚡ Building Data Indexes (Map)...");

	const slugsMap = new Map();
	if (Array.isArray(DB.basic)) {
		const slugCol = COLUMNS.basic?.slug || "slug";
		for (let i = 0; i < DB.basic.length; i++) {
			const slug = String(DB.basic[i][slugCol] || "").trim();
			if (slug) slugsMap.set(slug, DB.basic[i]);
		}
	}
	allData._indexes.slugs = slugsMap;

	// 🔥 ОПТИМІЗАЦІЯ: Підтримка крос-індексації за масивом колонок
	const buildIndex = (tableName, idColumns, forceArray = true) => {
		const map = new Map();
		const records = DB[tableName];

		if (!Array.isArray(records)) {
			allData._indexes[tableName] = map;
			return;
		}

		const cols = Array.isArray(idColumns) ? idColumns : [idColumns];

		for (let i = 0; i < records.length; i++) {
			const row = records[i];

			for (let c = 0; c < cols.length; c++) {
				const rawId = row[cols[c]];
				if (rawId === undefined || rawId === null) continue;

				const idStr = String(rawId).trim();
				if (!idStr) continue;

				if (forceArray) {
					let arr = map.get(idStr);
					if (!arr) {
						arr = [];
						map.set(idStr, arr);
					}
					// Захист від дублювання об'єкта при крос-індексації
					if (!arr.includes(row)) arr.push(row);
				} else {
					map.set(idStr, row);
				}
			}
		}

		allData._indexes[tableName] = map;
	};

	// --- БАЗОВІ ТАБЛИЦІ (1 до 1) ---
	buildIndex("basic", COLUMNS.basic?.id || "id", false);
	buildIndex("family", COLUMNS.familyList?.id || "id", false);
	buildIndex("names", COLUMNS.names?.personId || "person_id", false);
	buildIndex("kinship", COLUMNS.kinship?.id || "id", false);

	// --- ПОДІЇ ТА АРХІВИ (1 до багатьох) ---
	buildIndex("events", COLUMNS.events?.eventId || "event_id", true);

	buildIndex("birth", COLUMNS.birth?.personId || "person_id", true);
	buildIndex("baptism", COLUMNS.baptism?.personId || "person_id", true);
	buildIndex("death", COLUMNS.death?.personId || "person_id", true);
	buildIndex("funeral", COLUMNS.funeral?.personId || "person_id", true);

	// 🔥 ВИПРАВЛЕНО: Крос-індексація шлюбів для обох партнерів
	buildIndex(
		"marriage",
		[
			COLUMNS.marriage?.personId || "person_1",
			COLUMNS.marriage?.spouseId || "person_2",
		],
		true,
	);

	// --- НОВІ БЛОКИ АНКЕТИ ---
	buildIndex("awards", COLUMNS.awards?.personId || "person_id", true);
	buildIndex("military", COLUMNS.military?.personId || "person_id", true);
	buildIndex("education", COLUMNS.education?.personId || "person_id", true);
	buildIndex("job", COLUMNS.job?.personId || "person_id", true);
	buildIndex("gallery", COLUMNS.gallery?.personId || "person_id", true);
	buildIndex("domicile", COLUMNS.domicile?.personId || "person_id", true);

	buildIndex("identity", COLUMNS.identity?.personId || "person_id", false);
	buildIndex("personal", COLUMNS.personal?.personId || "person_id", false);
}
