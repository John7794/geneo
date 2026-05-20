// ./scripts/utils/kinshipUtils.js

import { COLUMNS } from "../core/dbSchema.js";
import { APP_CONFIG } from "../core/appConfig.js";
import { i18n } from "../core/i18n.js";
import { findPersonDetails, getList, getFullName } from "./personUtils.js";
import { isFemale, isMale } from "./genderUtils.js";
import { extractYear } from "./dateUtils.js";
import { RelationshipCalculator } from "../services/relationshipCalculator.js";

const SPLIT_REGEX = /[\s;]+/;

// Відновлено буферизований санітайзер без map/filter
const ensureArray = (val) => {
	if (!val) return [];
	if (typeof val === "string") {
		const parts = val.split(SPLIT_REGEX);
		const result = [];
		for (let i = 0; i < parts.length; i++) {
			const trimmed = parts[i].trim();
			if (trimmed) result.push(trimmed);
		}
		return result;
	}
	if (Array.isArray(val)) return val;
	return [];
};

// ==========================================
// 1. БАЗОВІ ХЕЛПЕРИ ЗВ'ЯЗКІВ
// ==========================================

export function getParentIds(personId, context) {
	if (context?.getParents) {
		return ensureArray(context.getParents(personId));
	}

	const cleanId = String(personId);
	const DB = context?.db || context;
	if (!Array.isArray(DB?.familyRoles)) return [];

	for (let i = 0; i < DB.familyRoles.length; i++) {
		const r = DB.familyRoles[i];
		if (String(r[COLUMNS.familyRoles?.personId || "person_id"]) === cleanId) {
			return ensureArray(r[COLUMNS.familyRoles?.parentsBio || "parents_bio"]);
		}
	}
	return [];
}

export function getSiblings(personId, context) {
	const parentIds = getParentIds(personId, context);
	const p = findPersonDetails(personId, context);
	const myName = getFullName(p) || p?.name || "";

	if (!parentIds || parentIds.length === 0) {
		return [{ id: personId, name: myName }];
	}

	const siblingSet = new Set([String(personId)]);

	if (typeof context?.getChildren === "function") {
		for (let i = 0; i < parentIds.length; i++) {
			const children = context.getChildren(parentIds[i]);
			const childArr = ensureArray(children);
			for (let j = 0; j < childArr.length; j++) {
				siblingSet.add(String(childArr[j]));
			}
		}
	} else {
		const myParentsStr = parentIds.map(String);
		const DB = context?.db || context;

		if (Array.isArray(DB?.familyRoles)) {
			const colPerson = COLUMNS.familyRoles?.personId || "person_id";
			const colBio = COLUMNS.familyRoles?.parentsBio || "parents_bio";

			for (let i = 0; i < DB.familyRoles.length; i++) {
				const row = DB.familyRoles[i];
				const rowParents = ensureArray(row[colBio]);

				let hasShared = false;
				for (let j = 0; j < rowParents.length; j++) {
					if (myParentsStr.includes(rowParents[j])) {
						hasShared = true;
						break;
					}
				}
				if (hasShared) siblingSet.add(String(row[colPerson]));
			}
		}
	}

	const result = [];
	const iterator = siblingSet.values();
	let step = iterator.next();
	while (!step.done) {
		const sId = step.value;
		const sibling = findPersonDetails(sId, context);
		result.push({ id: sId, name: getFullName(sibling) || sibling?.name || "" });
		step = iterator.next();
	}

	return result.sort((a, b) => a.name.localeCompare(b.name));
}

export function findSiblings(engine, id) {
	const result = { full: [], half_p: [], half_m: [], step: [] };
	if (!engine || !id) return result;

	const kinshipNode = engine.kinship ? engine.kinship[id] : null;
	if (kinshipNode && kinshipNode.sb) {
		return {
			full: ensureArray(kinshipNode.sb.full),
			half_p: ensureArray(kinshipNode.sb.half_p),
			half_m: ensureArray(kinshipNode.sb.half_m),
			step: ensureArray(kinshipNode.sb.step),
		};
	}

	result.half = [];
	const me = engine.getPerson(id);
	if (!me || !me.parents) return result;

	const myParents = ensureArray(me.parents);
	if (myParents.length === 0) return result;

	const candidates = new Set();
	for (let i = 0; i < myParents.length; i++) {
		const children = ensureArray(engine.getChildren(myParents[i]));
		for (let j = 0; j < children.length; j++) {
			candidates.add(String(children[j]));
		}
	}
	candidates.delete(String(id));

	const iterator = candidates.values();
	let step = iterator.next();
	while (!step.done) {
		const sibId = step.value;
		const sib = engine.getPerson(sibId);
		if (sib) {
			const sibParents = ensureArray(sib.parents);
			let sharedCount = 0;
			for (let i = 0; i < sibParents.length; i++) {
				if (myParents.includes(sibParents[i])) sharedCount++;
			}

			if (sharedCount >= 2) result.full.push(sibId);
			else result.half.push(sibId);
		}
		step = iterator.next();
	}

	return result;
}

export function findGrandparents(engine, id) {
	const result = { paternal: [], maternal: [] };
	if (!engine || !id) return result;

	const kinshipNode = engine.kinship ? engine.kinship[id] : null;
	if (kinshipNode && kinshipNode.gp) {
		return {
			paternal: ensureArray(kinshipNode.gp.f),
			maternal: ensureArray(kinshipNode.gp.m),
		};
	}

	const me = engine.getPerson(id);
	if (!me) return result;

	const myParents = ensureArray(me.parents);
	let dadId = null;
	let momId = null;

	for (let i = 0; i < myParents.length; i++) {
		const pId = myParents[i];
		const pObj = engine.getPerson(pId);
		if (pObj?.gender === "m") dadId = pId;
		else if (pObj?.gender === "f" || pObj?.gender !== "m") momId = pId;
	}

	if (dadId) result.paternal = ensureArray(engine.getParents(dadId));
	if (momId) result.maternal = ensureArray(engine.getParents(momId));

	if (!result.paternal.length && me.manualGrandparents?.paternal) {
		result.paternal = ensureArray(me.manualGrandparents.paternal);
	}
	if (!result.maternal.length && me.manualGrandparents?.maternal) {
		result.maternal = ensureArray(me.manualGrandparents.maternal);
	}

	return result;
}

export function getChildrenForMarriage(rawString, spouseId, allData, parentId) {
	if (!allData || !allData.getChildren || !parentId || !spouseId) return [];

	const childrenIds = ensureArray(allData.getChildren(parentId));
	const commonChildren = [];

	for (let i = 0; i < childrenIds.length; i++) {
		const childId = childrenIds[i];
		const parents = ensureArray(allData.getParents(childId));
		if (parents.includes(String(spouseId))) {
			commonChildren.push(childId);
		}
	}

	if (commonChildren.length === 0) return [];
	return getList(commonChildren.join(";"), allData);
}

// ==========================================
// 2. АЛГОРИТМИ ГРАФІВ ТА РОЗРАХУНОК СТУПЕНІВ
// ==========================================

export function calculateAncestryPath(rootId, targetId, context) {
	const formatNode = (id) => {
		const p = findPersonDetails(id, context);
		return {
			id: id,
			name: getFullName(p) || p?.name || "",
			siblings: getSiblings(id, context),
		};
	};

	if (String(rootId) === String(targetId)) return [formatNode(rootId)];

	const queue = [[String(rootId)]];
	const visited = new Set([String(rootId)]);
	let head = 0;

	while (head < queue.length) {
		const pathIds = queue[head++];
		const currentId = pathIds[pathIds.length - 1];

		if (String(currentId) === String(targetId)) {
			return pathIds.map(formatNode);
		}

		const parents = getParentIds(currentId, context);
		for (let i = 0; i < parents.length; i++) {
			const pId = String(parents[i]);
			if (!visited.has(pId)) {
				visited.add(pId);
				queue.push([...pathIds, pId]);
			}
		}
	}
	return [formatNode(targetId)];
}

export function findAllPathsToAncestor(
	currentId,
	targetId,
	context,
	basicIndex = null,
	currentPath = [],
	visited = new Set(),
) {
	const cleanCurrentId = String(currentId);
	let person = null;

	if (basicIndex instanceof Map) {
		person = basicIndex.get(cleanCurrentId);
	} else {
		const DB = context?.db || context;
		if (Array.isArray(DB?.basic)) {
			const colId = COLUMNS.basic?.id || "id";
			for (let i = 0; i < DB.basic.length; i++) {
				if (String(DB.basic[i][colId]) === cleanCurrentId) {
					person = DB.basic[i];
					break;
				}
			}
		}
	}

	if (!person || visited.has(cleanCurrentId)) return [];

	visited.add(cleanCurrentId);
	currentPath.push(person);

	if (cleanCurrentId === String(targetId)) {
		const result = [[...currentPath]];
		currentPath.pop();
		visited.delete(cleanCurrentId);
		return result;
	}

	if (currentPath.length > 60) {
		currentPath.pop();
		visited.delete(cleanCurrentId);
		return [];
	}

	const parentsIds = getParentIds(cleanCurrentId, context);
	const paths = [];

	for (let i = 0; i < parentsIds.length; i++) {
		const pId = parentsIds[i];
		if (!pId || visited.has(pId)) continue;

		const subPaths = findAllPathsToAncestor(
			pId,
			targetId,
			context,
			basicIndex,
			currentPath,
			visited,
		);
		for (let j = 0; j < subPaths.length; j++) {
			paths.push(subPaths[j]);
		}
	}

	currentPath.pop();
	visited.delete(cleanCurrentId);

	return paths;
}

export function calculateComplexRelationship(engine, idA, idB) {
	if (!engine || !idA || !idB) return [];
	const calculator = new RelationshipCalculator(engine);
	return calculator.calculate(idA, idB);
}

// ==========================================
// 3. ФОРМАТУВАННЯ ДАНИХ ДЛЯ UI
// ==========================================

export function formatGraphNode(id, basicMap, familyMap, birthMap, deathMap) {
	const strId = String(id).trim();

	const formatRawDates = (bStr, dStr) => {
		const b = typeof extractYear === "function" ? extractYear(bStr) : "";
		const d = typeof extractYear === "function" ? extractYear(dStr) : "";

		if (!b && !d) return "";
		if (d) return `${b || "?"} – ${d}`;
		return `* ${b}`;
	};

	const getLifeYears = (basicRow) => {
		if (!basicRow) return "";
		const bDate =
			basicRow[COLUMNS.basic?.birthDate || "birth_date"] || birthMap.get(strId);
		const dDate =
			basicRow[COLUMNS.basic?.deathDate || "death_date"] || deathMap.get(strId);
		return formatRawDates(bDate, dDate);
	};

	// Сувора інвертована логіка бази даних
	const resolveStatusUI = (rawStatus) => {
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
			s === "так" ||
			s === "confirmed"
		) {
			return "confirmed";
		}
		return "hypothetical";
	};

	const basic = basicMap.get(strId);
	if (basic) {
		return {
			id: strId,
			type: "direct",
			name: basic[COLUMNS.basic?.name || "name"],
			surname: basic[COLUMNS.basic?.surname || "surname"],
			photo: basic[COLUMNS.basic?.photo || "photo"],
			gender: basic[COLUMNS.basic?.gender || "gender"],
			status: resolveStatusUI(basic[COLUMNS.basic?.status || "status"]),
			lifeYears: getLifeYears(basic),
		};
	}

	const fam = familyMap.get(strId);

	if (fam) {
		const rawStatus =
			fam[COLUMNS.familyList?.status] !== undefined
				? fam[COLUMNS.familyList?.status]
				: fam.fam_status;
		return {
			id: strId,
			type: "indirect",
			name: fam[COLUMNS.familyList?.firstName || "fam_first_name"],
			surname: fam[COLUMNS.familyList?.surname || "fam_surname"],
			photo: fam[COLUMNS.familyList?.photo || "fam_photo"],
			gender: fam[COLUMNS.familyList?.gender || "fam_gender"],
			status: resolveStatusUI(rawStatus),
			lifeYears: formatRawDates(
				fam[COLUMNS.familyList?.birthDate || "fam_birth_date"],
				fam[COLUMNS.familyList?.deathDate || "fam_death_date"],
			),
		};
	}

	return {
		id: strId,
		type: "unknown",
		name: i18n.t("common.unknown") || "Unknown",
		surname: "",
		status: "hypothetical",
	};
}

export function generateRelationshipLabel(distS, distT, genderTarget) {
	if (distS === undefined || distT === undefined || distS < 0 || distT < 0) {
		return i18n.t("common.unknown") || "Невизначено";
	}

	const fem = isFemale(genderTarget);
	const mal = isMale(genderTarget);

	if (distT === 0) {
		if (distS === 0) return "Я";
		if (distS === 1)
			return fem
				? i18n.t("roles.mother") || "Мати"
				: mal
					? i18n.t("roles.father") || "Батько"
					: i18n.t("roles.parent") || "Один із батьків";
		if (distS === 2)
			return fem
				? i18n.t("roles.grandmother") || "Бабуся"
				: mal
					? i18n.t("roles.grandfather") || "Дід"
					: i18n.t("roles.grandparent") || "Баба / Дід";
		if (distS === 3)
			return fem
				? i18n.t("roles.greatGrandmother") || "Прабабуся"
				: mal
					? i18n.t("roles.greatGrandfather") || "Прадід"
					: i18n.t("roles.greatGrandparent") || "Прабаба / Прадід";

		const count = Math.max(0, distS - 2);
		const pra = (i18n.t("kinship.praPrefix") || "Пра").repeat(count);
		const base = fem
			? i18n.t("roles.grandmother") || "бабуся"
			: mal
				? i18n.t("roles.grandfather") || "дід"
				: i18n.t("roles.grandparent") || "баба / дід";
		return pra + base.toLowerCase();
	}

	if (distS === 0) {
		if (distT === 1)
			return fem
				? i18n.t("roles.daughter") || "Донька"
				: mal
					? i18n.t("roles.son") || "Син"
					: i18n.t("roles.child") || "Дитина";
		if (distT === 2)
			return fem
				? i18n.t("roles.granddaughter") || "Онука"
				: mal
					? i18n.t("roles.grandson") || "Онук"
					: i18n.t("roles.grandchild") || "Онук / Онука";
		if (distT === 3)
			return fem
				? i18n.t("roles.greatGranddaughter") || "Правнучка"
				: mal
					? i18n.t("roles.greatGrandson") || "Правнук"
					: i18n.t("roles.greatGrandchild") || "Правнук / Правнучка";

		const count = Math.max(0, distT - 2);
		const pra = (i18n.t("kinship.praPrefix") || "Пра").repeat(count);
		const base = fem
			? i18n.t("roles.granddaughter") || "онука"
			: mal
				? i18n.t("roles.grandson") || "онук"
				: i18n.t("roles.grandchild") || "онук / онука";
		return pra + base.toLowerCase();
	}

	const min = Math.min(distS, distT);
	const diff = Math.abs(distS - distT);

	let prefix = "";
	if (min === 1) prefix = "";
	else if (min === 2)
		prefix = fem ? "Двоюрідна " : mal ? "Двоюрідний " : "Двоюрідні ";
	else if (min === 3)
		prefix = fem ? "Троюрідна " : mal ? "Троюрідний " : "Троюрідні ";
	else prefix = `${min}-юрідн${fem ? "а" : mal ? "ий" : "і"} `;

	if (diff === 0) {
		if (min === 1)
			return fem
				? i18n.t("roles.sister") || "Сестра"
				: mal
					? i18n.t("roles.brother") || "Брат"
					: i18n.t("roles.sibling") || "Брат / Сестра";
		return `${prefix}${fem ? "сестра" : mal ? "брат" : "брат/сестра"}`;
	}

	const targetIsOlderGeneration = distT < distS;

	if (targetIsOlderGeneration) {
		const base = fem
			? i18n.t("roles.aunt") || "Тітка"
			: mal
				? i18n.t("roles.uncle") || "Дядько"
				: i18n.t("roles.parentSibling") || "Тітка / Дядько";
		if (min === 1 && diff === 1) return base;
		return `${prefix}${min === 1 ? base : base.toLowerCase()}`;
	} else {
		const base = fem
			? i18n.t("roles.niece") || "Племінниця"
			: mal
				? i18n.t("roles.nephew") || "Племінник"
				: i18n.t("roles.nibling") || "Племінник / Племінниця";
		if (min === 1 && diff === 1) return base;
		return `${prefix}${min === 1 ? base : base.toLowerCase()}`;
	}
}

export function getKinshipColumns(targetId, context) {
	const rootId = APP_CONFIG.rootId;
	const cleanTargetId = String(targetId);
	if (!rootId || !cleanTargetId || String(rootId) === cleanTargetId) return [];

	const DB = context?.db || context;

	// Пріоритет глобальному кешу для усунення переіндексації O(N)
	let basicIndex = context?._indexes?.basic;

	if (!basicIndex) {
		basicIndex = new Map();
		if (Array.isArray(DB?.basic)) {
			const colId = COLUMNS.basic?.id || "id";
			for (let i = 0; i < DB.basic.length; i++) {
				const row = DB.basic[i];
				basicIndex.set(String(row[colId]), row);
			}
		}
	}

	const allPaths = findAllPathsToAncestor(
		rootId,
		cleanTargetId,
		context,
		basicIndex,
	);
	if (allPaths.length === 0) return [];

	const targetPerson = basicIndex.get(cleanTargetId);
	const targetGender = targetPerson
		? targetPerson[COLUMNS.basic?.gender || "gender"]
		: null;

	// Динамічний обчислювач глибини замість жорсткого ліміту
	let maxDepth = 0;
	for (let i = 0; i < allPaths.length; i++) {
		if (allPaths[i].length > maxDepth) maxDepth = allPaths[i].length;
	}

	const columnsData = [];
	for (let colIndex = 0; colIndex < 5; colIndex++) {
		const col = buildColumnData(colIndex, allPaths, targetGender, cleanTargetId);
		if (col) columnsData.push(col);
	}
	return columnsData;
}

function buildColumnData(generationIndex, allPaths, targetGender, targetId) {
	const descendantsMap = new Map();
	let orderCounter = 0;
	const colId = COLUMNS.basic?.id || "id";

	for (let i = 0; i < allPaths.length; i++) {
		const path = allPaths[i];
		if (path.length > generationIndex) {
			const person = path[generationIndex];
			const distanceToTarget = path.length - 1 - generationIndex;

			if (distanceToTarget > 0) {
				const pId = String(person[colId]);

				if (!descendantsMap.has(pId)) {
					descendantsMap.set(pId, {
						person: person,
						distances: new Set(),
						order: orderCounter++,
					});
				}
				descendantsMap.get(pId).distances.add(distanceToTarget);
			}
		}
	}

	if (descendantsMap.size === 0) return null;

	const items = [];
	const entries = Array.from(descendantsMap.values());

	for (let i = 0; i < entries.length; i++) {
		const value = entries[i];
		const distArray = Array.from(value.distances).sort((a, b) => a - b);

		items.push({
			role: generateRoleString(distArray, targetGender),
			personId: value.person[colId],
			personName: value.person[COLUMNS.basic?.name || "name"],
			personPatronymic: value.person[COLUMNS.basic?.patronymic || "patronymic"],
			isRoot: generationIndex === 0,
			order: value.order,
		});
	}

	return items.sort((a, b) => a.order - b.order);
}

function generateRoleString(distances, targetGender) {
	const fem = isFemale(targetGender);
	const mal = isMale(targetGender);

	const baseEnd = fem
		? i18n.t("roles.grandmother") || "баба"
		: mal
			? i18n.t("roles.grandfather") || "дід"
			: i18n.t("roles.grandparent") || "баба / дід";
	const prefix = i18n.t("kinship.praPrefix") || "пра";

	const getSingleRole = (d) => {
		if (d === 1)
			return fem
				? i18n.t("roles.mother") || "мати"
				: mal
					? i18n.t("roles.father") || "батько"
					: i18n.t("roles.parent") || "один із батьків";
		if (d === 2) return baseEnd;
		if (d === 3)
			return fem
				? i18n.t("roles.greatGrandmother") || "прабаба"
				: mal
					? i18n.t("roles.greatGrandfather") || "прадід"
					: i18n.t("roles.greatGrandparent") || "прабаба / прадід";
		return `${prefix}(${d - 2})${baseEnd}`;
	};

	if (distances.length === 1) return getSingleRole(distances[0]);

	let allGreaterThanTwo = true;
	for (let i = 0; i < distances.length; i++) {
		if (distances[i] <= 2) {
			allGreaterThanTwo = false;
			break;
		}
	}

	if (allGreaterThanTwo) {
		return `${prefix}(${distances.map((d) => d - 2).join("/")})${baseEnd}`;
	}

	return distances.map(getSingleRole).join(" / ");
}
