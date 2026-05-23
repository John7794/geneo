// ./scripts/utils/personUtils.js

import { COLUMNS } from "../core/dbSchema.js";
import { PATHS } from "../core/appConfig.js";
import { i18n } from "../core/i18n.js";
import { splitString, convertDriveLink } from "./helpers.js";
import { normalizeGender } from "./genderUtils.js";

function extractBaseId(exactId) {
	const idx = exactId.lastIndexOf("::");
	return idx !== -1 ? exactId.substring(idx + 2) : exactId;
}

const extractYear = (dateStr) => {
	if (
		!dateStr ||
		String(dateStr).trim() === "null" ||
		String(dateStr).trim() === "undefined"
	)
		return "";
	const match = String(dateStr).match(/\b(1[56789]\d{2}|20\d{2})\b/);
	return match ? match[0] : String(dateStr).trim();
};

const calculateLifeCycle = (bStr, dStr, vStatus, hasDeathRecord = false) => {
	const actualBYear = extractYear(bStr);
	const actualDYear = extractYear(dStr);

	// 🔥 Ліквідовано аномалію воскресіння мертвих
	let isAlive = !actualDYear;
	if (actualDYear === "?" || hasDeathRecord) {
		isAlive = false;
	} else if (actualBYear) {
		const currentYear = new Date().getFullYear();
		if (currentYear - parseInt(actualBYear, 10) > 120) {
			isAlive = false;
		}
	}

	if (
		vStatus !== undefined &&
		vStatus !== null &&
		String(vStatus).trim() !== "" &&
		String(vStatus).trim() !== "null"
	) {
		const v = String(vStatus).trim().toLowerCase();
		if (v === "1" || v === "true" || v === "+") isAlive = true;
		if (v === "0" || v === "false" || v === "-") isAlive = false;
	}

	let lifeYears = "";
	if (isAlive) {
		if (actualBYear) lifeYears = `* ${actualBYear}`;
	} else {
		if (actualBYear || actualDYear) {
			lifeYears = `${actualBYear || "?"} – ${actualDYear || "?"}`;
		}
	}

	return {
		birth_year: actualBYear,
		death_year: actualDYear,
		lifeYears: lifeYears,
		isAlive: isAlive,
	};
};

function resolveStatus(rawStatus) {
	if (
		rawStatus === undefined ||
		rawStatus === null ||
		String(rawStatus).trim() === ""
	) {
		return "hypothetical";
	}
	const s = String(rawStatus).trim().toLowerCase();
	if (
		s === "1" ||
		s === "true" ||
		s === "+" ||
		s === "confirmed" ||
		s === "так"
	) {
		return "confirmed";
	}
	return "hypothetical";
}

export function resolveRealId(queryId, ctx) {
	if (!queryId) return null;
	const exactId = String(queryId).trim();
	const baseId = extractBaseId(exactId);

	const DB = ctx?.db || ctx;
	if (!DB || !Array.isArray(DB.basic)) return baseId;

	if (ctx?._indexes?.slugs && ctx._indexes.slugs.has(baseId)) {
		return String(
			ctx._indexes.slugs.get(baseId)[COLUMNS.basic?.id || "id"],
		).trim();
	}

	for (let i = 0; i < DB.basic.length; i++) {
		if (String(DB.basic[i][COLUMNS.basic?.slug || "slug"]).trim() === baseId) {
			return String(DB.basic[i][COLUMNS.basic?.id || "id"]).trim();
		}
	}

	return baseId;
}

export function getProfileUrl(personId, ctx) {
	if (!personId) return "#";
	const exactId = String(personId).trim();
	const baseId = extractBaseId(exactId);

	const DB = ctx?.db || ctx;
	const viewParam = ctx?.view ? `&view=${ctx.view}` : "";

	if (!DB || !Array.isArray(DB.basic)) return `?id=${baseId}${viewParam}`;

	let personRow = ctx?._indexes?.basic?.get(baseId);

	if (!personRow) {
		for (let i = 0; i < DB.basic.length; i++) {
			if (String(DB.basic[i][COLUMNS.basic?.id || "id"]).trim() === baseId) {
				personRow = DB.basic[i];
				break;
			}
		}
	}

	if (personRow && personRow[COLUMNS.basic?.slug || "slug"]) {
		const slug = String(personRow[COLUMNS.basic?.slug || "slug"]).trim();
		if (slug !== "") return `?id=${slug}${viewParam}`;
	}

	return `?id=${baseId}${viewParam}`;
}

export function getFullName(personObj) {
	if (!personObj) return "";

	// Оптимізація пам'яті: відмова від шаблонних рядків для усунення подвійних пробілів
	const s =
		personObj[COLUMNS.basic?.surname || "surname"] || personObj.surname || "";
	const n = personObj[COLUMNS.basic?.name || "name"] || personObj.name || "";
	const p =
		personObj[COLUMNS.basic?.patronymic || "patronymic"] ||
		personObj.patronymic ||
		"";

	let res = "";
	if (s) res += s;
	if (n) res += (res ? " " : "") + n;
	if (p) res += (res ? " " : "") + p;

	return res;
}

export function getAvatarUrl(identifier, genderParam) {
	let fallbackSrc = PATHS.iconMale;

	if (typeof genderParam === "boolean") {
		fallbackSrc = genderParam ? PATHS.iconFemale : PATHS.iconMale;
	} else {
		const normalized = normalizeGender(genderParam);
		if (normalized === "f") fallbackSrc = PATHS.iconFemale;
	}

	if (!identifier || String(identifier).trim() === "") {
		return fallbackSrc;
	}

	const exactId = String(identifier).trim();
	
	if (exactId.includes("google.com")) {
		return convertDriveLink(exactId);
	}

	const baseId = extractBaseId(exactId);

	if (baseId.includes("/")) return baseId;
	if (baseId.includes(".")) return `${PATHS.portraits}${baseId}`;

	return `${PATHS.portraits}${baseId}.png`;
}

export function getGenitiveName(item) {
	if (!item) return "";
	const mapKey = `genitiveNames.${item.personId}`;
	const dictName = i18n.t(mapKey);
	const hasTranslation = dictName && dictName !== mapKey;

	const fallbackName =
		`${item.personName || ""} ${item.personPatronymic || ""}`.trim();
	return hasTranslation ? dictName : fallbackName;
}

function processSecondarySource(rawRow, C, sourceName, exactId, engineData) {
	const rawPhoto =
		rawRow[C?.photo || "photo"] || rawRow.photo || rawRow.fam_photo || null;

	let bDate =
		rawRow[C?.birthDate || "birthDate"] ||
		rawRow.birthDate ||
		rawRow.birth_date ||
		rawRow.fam_birth_date ||
		"";
	let dDate =
		rawRow[C?.deathDate || "deathDate"] ||
		rawRow.deathDate ||
		rawRow.death_date ||
		rawRow.fam_death_date ||
		"";
	let vStatus =
		rawRow[C?.vitalStatus || "vitalStatus"] ||
		rawRow.vitalStatus ||
		rawRow.vital_status ||
		rawRow.fam_vital_status;

	let hasDeathRecord = false;

	if (engineData?._indexes) {
		const cleanId = extractBaseId(exactId);
		if (!bDate && engineData._indexes.birth?.has(cleanId)) {
			const bRecords = engineData._indexes.birth.get(cleanId);
			if (bRecords && bRecords[0])
				bDate =
					bRecords[0][COLUMNS.birth?.year || "year"] ||
					bRecords[0].fam_year ||
					bDate;
		}
		if (engineData._indexes.death?.has(cleanId)) {
			hasDeathRecord = true;
			if (!dDate) {
				const dRecords = engineData._indexes.death.get(cleanId);
				if (dRecords && dRecords[0])
					dDate =
						dRecords[0][COLUMNS.death?.year || "year"] ||
						dRecords[0].fam_year ||
						dDate;
			}
		}
	}

	const statusKey = C?.status || "status";
	const rawStatus =
		rawRow[statusKey] !== undefined
			? rawRow[statusKey]
			: rawRow.status !== undefined
				? rawRow.status
				: rawRow.fam_status;

	const safeStatus = resolveStatus(rawStatus);
	const lifeCycle = calculateLifeCycle(bDate, dDate, vStatus, hasDeathRecord);

	return {
		source: sourceName,
		id: exactId,
		name:
			rawRow[C?.firstName || "firstName"] ||
			rawRow.firstName ||
			rawRow.fam_first_name ||
			"",
		surname:
			rawRow[C?.surname || "surname"] ||
			rawRow.surname ||
			rawRow.fam_surname ||
			"",
		patronymic:
			rawRow[C?.patronymic || "patronymic"] ||
			rawRow.patronymic ||
			rawRow.fam_patronymic ||
			"",
		gender: normalizeGender(
			rawRow[C?.gender || "gender"] || rawRow.gender || rawRow.fam_gender,
		),
		title: rawRow[C?.title || "title"] || rawRow.title || "",
		photo: rawPhoto,
		bioUrl: rawRow[C?.bioUrl || "bioUrl"] || rawRow.bioUrl || "",
		birthDate: bDate,
		deathDate: dDate,
		birth_year: lifeCycle.birth_year,
		death_year: lifeCycle.death_year,
		lifeYears: lifeCycle.lifeYears,
		isAlive: lifeCycle.isAlive,
		birthPlace:
			rawRow[C?.birthPlace || "birthPlace"] || rawRow.birthPlace || "",
		deathPlace:
			rawRow[C?.deathPlace || "deathPlace"] || rawRow.deathPlace || "",
		origin: rawRow[C?.origin || "origin"] || rawRow.origin || "",
		nobleNickname:
			rawRow[C?.nobleNickname || "nobleNickname"] || rawRow.nobleNickname || "",
		coatOfArms:
			rawRow[C?.coatOfArms || "coatOfArms"] || rawRow.coatOfArms || "",
		socialStatus:
			rawRow[C?.socialStatus || "socialStatus"] || rawRow.socialStatus || "",
		religion: rawRow[C?.religion || "religion"] || rawRow.religion || "",
		maritalStatus:
			rawRow[C?.maritalStatus || "maritalStatus"] || rawRow.maritalStatus || "",
		kinship: rawRow[C?.note || "note"] || rawRow.note || "",
		status: safeStatus,
		hasProfile: false,
		_engine: engineData,
	};
}

function buildBasicPersonObj(basicPerson, nameInfo, exactId, allData) {
	const rawPhoto =
		basicPerson[COLUMNS.basic?.photo || "photo"] || basicPerson.photo || null;

	let bDate =
		basicPerson[COLUMNS.basic?.birthDate || "birthDate"] ||
		basicPerson.birthDate ||
		basicPerson.birth_date ||
		"";
	let dDate =
		basicPerson[COLUMNS.basic?.deathDate || "deathDate"] ||
		basicPerson.deathDate ||
		basicPerson.death_date ||
		"";
	let vStatus =
		basicPerson[COLUMNS.basic?.vitalStatus || "vitalStatus"] ||
		basicPerson.vitalStatus ||
		basicPerson.vital_status;

	let hasDeathRecord = false;

	if (allData?._indexes) {
		const cleanId = extractBaseId(exactId);
		if (!bDate && allData._indexes.birth?.has(cleanId)) {
			const bRecords = allData._indexes.birth.get(cleanId);
			if (bRecords && bRecords[0])
				bDate =
					bRecords[0][COLUMNS.birth?.year || "year"] ||
					bRecords[0].fam_year ||
					bDate;
		}
		if (allData._indexes.death?.has(cleanId)) {
			hasDeathRecord = true;
			if (!dDate) {
				const dRecords = allData._indexes.death.get(cleanId);
				if (dRecords && dRecords[0])
					dDate =
						dRecords[0][COLUMNS.death?.year || "year"] ||
						dRecords[0].fam_year ||
						dDate;
			}
		}
	}

	const statusKey = COLUMNS.basic?.status || "status";
	const rawStatus =
		basicPerson[statusKey] !== undefined
			? basicPerson[statusKey]
			: basicPerson.status;

	const safeStatus = resolveStatus(rawStatus);
	const lifeCycle = calculateLifeCycle(bDate, dDate, vStatus, hasDeathRecord);

	return {
		source: "basic",
		id: exactId,
		photo: rawPhoto,
		name: basicPerson[COLUMNS.basic?.name || "name"] || basicPerson.name || "",
		surname:
			basicPerson[COLUMNS.basic?.surname || "surname"] ||
			basicPerson.surname ||
			"",
		slug: basicPerson[COLUMNS.basic?.slug || "slug"] || basicPerson.slug || "",
		patronymic:
			basicPerson[COLUMNS.basic?.patronymic || "patronymic"] ||
			basicPerson.patronymic ||
			"",
		gender: normalizeGender(
			basicPerson[COLUMNS.basic?.gender || "gender"] || basicPerson.gender,
		),
		status: safeStatus,
		vitalStatus: vStatus,
		maidenName:
			nameInfo?.[COLUMNS.names?.bSurname || "bSurname"] ||
			nameInfo?.bSurname ||
			"",
		title: nameInfo?.[COLUMNS.names?.title || "title"] || nameInfo?.title || "",
		job: nameInfo?.job || "",
		religion: nameInfo?.religion || "",
		marital: nameInfo?.marital_status || "",
		kinship: nameInfo?.kinship_degree || "",
		nobleNickname: nameInfo?.noble_nickname || "",
		origin: nameInfo?.origin || "",
		coatOfArms: nameInfo?.coat_of_arms || "",
		birth_year: lifeCycle.birth_year,
		death_year: lifeCycle.death_year,
		lifeYears: lifeCycle.lifeYears,
		isAlive: lifeCycle.isAlive,
		lifePlaces: basicPerson.life_places || "",
		bioUrl:
			basicPerson[COLUMNS.basic?.bioUrl || "bioUrl"] ||
			basicPerson.bio_url ||
			"",
		birthDate: bDate,
		deathDate: dDate,
		hasProfile: true,
		_engine: allData,
	};
}

export function findPersonDetails(personId, allData) {
	if (!personId) {
		return {
			id: null,
			name: "",
			surname: "",
			hasProfile: false,
			source: "unknown",
		};
	}

	const exactId = String(personId).trim();
	const dbSearchId = extractBaseId(exactId);

	const DB = allData?.db || allData || {};
	const indexes = allData?._indexes || {};

	if (DB.basic) {
		let basicPerson = indexes.basic ? indexes.basic.get(dbSearchId) : null;

		if (!basicPerson && Array.isArray(DB.basic)) {
			const idCol = COLUMNS.basic?.id || "id";
			const slugCol = COLUMNS.basic?.slug || "slug";

			for (let i = 0; i < DB.basic.length; i++) {
				const rowId = String(DB.basic[i][idCol] || DB.basic[i].id).trim();
				const rowSlug = String(DB.basic[i][slugCol] || DB.basic[i].slug).trim();
				if (rowId === dbSearchId || rowSlug === dbSearchId) {
					basicPerson = DB.basic[i];
					break;
				}
			}
		}

		if (basicPerson) {
			const idCol = COLUMNS.basic?.id || "id";
			const actualId = String(basicPerson[idCol] || basicPerson.id).trim();
			let nameInfo = indexes.names ? indexes.names.get(actualId) : null;

			if (!nameInfo && Array.isArray(DB.names)) {
				const nameIdCol = COLUMNS.names?.personId || "personId";
				for (let i = 0; i < DB.names.length; i++) {
					if (
						String(DB.names[i][nameIdCol] || DB.names[i].personId).trim() ===
						actualId
					) {
						nameInfo = DB.names[i];
						break;
					}
				}
			}

			return buildBasicPersonObj(basicPerson, nameInfo, exactId, allData);
		}
	}

	if (DB.familyList) {
		const famIndex = indexes.family || indexes.familyList;
		let rawRow = famIndex ? famIndex.get(dbSearchId) : null;

		if (!rawRow && Array.isArray(DB.familyList)) {
			const famIdCol = COLUMNS.familyList?.id || "id";
			for (let i = 0; i < DB.familyList.length; i++) {
				const r = DB.familyList[i];
				if (String(r[famIdCol] || r.fam_id || r.id).trim() === dbSearchId) {
					rawRow = r;
					break;
				}
			}
		}

		if (rawRow) {
			return processSecondarySource(
				rawRow,
				COLUMNS.familyList || {},
				"family_list",
				exactId,
				allData,
			);
		}
	}

	if (DB.participants) {
		let rawRow = indexes.participants
			? indexes.participants.get(dbSearchId)
			: null;

		if (!rawRow && Array.isArray(DB.participants)) {
			const partIdCol = COLUMNS.participants?.id || "id";
			for (let i = 0; i < DB.participants.length; i++) {
				const r = DB.participants[i];
				if (String(r[partIdCol] || r.id).trim() === dbSearchId) {
					rawRow = r;
					break;
				}
			}
		}

		if (rawRow) {
			return processSecondarySource(
				rawRow,
				COLUMNS.participants || {},
				"participants",
				exactId,
				allData,
			);
		}
	}

	const idPrefix = i18n.t("common.id") || "ID";
	return {
		id: exactId,
		name: exactId ? `${idPrefix}: ${exactId}` : "",
		surname: "",
		hasProfile: false,
		source: "unknown",
	};
}

export function getList(idsString, allData) {
	if (!idsString) return [];
	const ids = splitString(idsString);
	const result = new Array(ids.length);
	for (let i = 0; i < ids.length; i++) {
		result[i] = findPersonDetails(ids[i], allData);
	}
	return result;
}

export function getGroupedList(idsString, allData) {
	if (!idsString) return [];

	const map = new Map();
	const pairs = splitString(idsString);

	for (let i = 0; i < pairs.length; i++) {
		const pair = pairs[i];
		const colonIdx = pair.indexOf(":");

		if (colonIdx !== -1) {
			const parentId = pair.substring(0, colonIdx).trim();
			const childId = pair.substring(colonIdx + 1).trim();

			if (parentId && childId) {
				let kidsList = map.get(parentId);
				if (!kidsList) {
					kidsList = [];
					map.set(parentId, kidsList);
				}
				kidsList.push(findPersonDetails(childId, allData));
			}
		}
	}

	const result = new Array(map.size);
	let index = 0;
	const iterator = map.entries();
	let step = iterator.next();

	while (!step.done) {
		const [pId, kids] = step.value;
		result[index++] = {
			parent: findPersonDetails(pId, allData),
			kids: kids,
		};
		step = iterator.next();
	}

	return result;
}
