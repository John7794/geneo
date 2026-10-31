// ./scripts/services/familyAdapter.js

import { COLUMNS } from "../core/dbSchema.js";

/**
 * Адаптер генеалогічної моделі сімей (GEDCOM FAM) для зворотної сумісності.
 * Дозволяє системі безшовно функціонувати як з нормалізованими таблицями
 * families.csv та familyChildren.csv, так і підтримувати застарілі інтерфейси familyRoles.
 */

function cleanId(val) {
	if (val === undefined || val === null) return "";
	const s = String(val).trim();
	if (s.toLowerCase() === "n" || s === "-") return "";
	return s;
}

/**
 * Генерує сумісний масив рядків familyRoles з нормалізованих таблиць families та familyChildren.
 * 
 * @param {Array<Object>} families - рядки таблиці families
 * @param {Array<Object>} familyChildren - рядки таблиці familyChildren
 * @returns {Array<Object>} - масив об'єктів формату familyRoles
 */
export function buildFamilyRolesFromFamilies(families = [], familyChildren = []) {
	if (!Array.isArray(families) || families.length === 0) return [];

	const colFam = COLUMNS.families || {};
	const colChild = COLUMNS.familyChildren || {};

	// 1. Індексація сімей за family_id
	const familyMap = new Map();
	// Індексація подружжів: personId -> Set<spouseId>
	const spousesMap = new Map();

	for (let i = 0; i < families.length; i++) {
		const f = families[i];
		const famId = cleanId(f[colFam.familyId] || f.family_id);
		const husbId = cleanId(f[colFam.husbandId] || f.husband_id);
		const wifeId = cleanId(f[colFam.wifeId] || f.wife_id);

		if (famId) {
			familyMap.set(famId, { famId, husbId, wifeId });
		}

		if (husbId && wifeId) {
			if (!spousesMap.has(husbId)) spousesMap.set(husbId, new Set());
			if (!spousesMap.has(wifeId)) spousesMap.set(wifeId, new Set());
			spousesMap.get(husbId).add(wifeId);
			spousesMap.get(wifeId).add(husbId);
		}
	}

	// 2. Індексація зв'язків батьки-діти
	// childRolesMap: childId -> { bio: Set, adopted: Set, step: Set }
	const childRolesMap = new Map();

	for (let i = 0; i < familyChildren.length; i++) {
		const fc = familyChildren[i];
		const famId = cleanId(fc[colChild.familyId] || fc.family_id);
		const childId = cleanId(fc[colChild.childId] || fc.child_id);
		const pType = (fc[colChild.pedigreeType] || fc.pedigree_type || "birth").toLowerCase();

		if (!childId || !famId) continue;

		if (!childRolesMap.has(childId)) {
			childRolesMap.set(childId, {
				bio: new Set(),
				adopted: new Set(),
				step: new Set(),
			});
		}

		const roles = childRolesMap.get(childId);
		const fam = familyMap.get(famId);
		if (fam) {
			const targetSet = pType === "adopted" ? roles.adopted : pType === "step" ? roles.step : roles.bio;
			if (fam.husbId) targetSet.add(fam.husbId);
			if (fam.wifeId) targetSet.add(fam.wifeId);
		}
	}

	// 3. Об'єднання всіх унікальних person_id
	const allPersons = new Set([...spousesMap.keys(), ...childRolesMap.keys()]);
	const rolesRows = [];

	for (const pid of allPersons) {
		const childInfo = childRolesMap.get(pid);
		const spouses = spousesMap.get(pid);

		const bioStr = childInfo ? Array.from(childInfo.bio).join(";") : "";
		const adoptedStr = childInfo ? Array.from(childInfo.adopted).join(";") : "";
		const stepStr = childInfo ? Array.from(childInfo.step).join(";") : "";
		const spousesStr = spouses ? Array.from(spouses).join(";") : "";

		rolesRows.push({
			person_id: pid,
			parents_bio: bioStr,
			parents_step: stepStr,
			parents_adopted: adoptedStr,
			grandparents_f: "",
			grandparents_m: "",
			spouses: spousesStr,
		});
	}

	return rolesRows;
}

/**
 * Пряме зв'язування екземплярів peopleMap із нормалізованих таблиць families і familyChildren.
 * 
 * @param {Map<string, Object>} peopleMap - словник персон
 * @param {Array<Object>} families - таблиця families
 * @param {Array<Object>} familyChildren - таблиця familyChildren
 */
export function linkRelationshipsFromFamilies(peopleMap, families = [], familyChildren = []) {
	if (!peopleMap || !(peopleMap instanceof Map)) return;
	if (!Array.isArray(families) || !Array.isArray(familyChildren)) return;

	const colFam = COLUMNS.families || {};
	const colChild = COLUMNS.familyChildren || {};

	const familyMap = new Map();
	for (let i = 0; i < families.length; i++) {
		const f = families[i];
		const famId = cleanId(f[colFam.familyId] || f.family_id);
		const husbId = cleanId(f[colFam.husbandId] || f.husband_id);
		const wifeId = cleanId(f[colFam.wifeId] || f.wife_id);

		if (famId) {
			familyMap.set(famId, { famId, husbId, wifeId });
		}

		// Подружжя
		if (husbId && wifeId) {
			const pHusb = peopleMap.get(husbId);
			const pWife = peopleMap.get(wifeId);
			if (pHusb && !pHusb.spouses.includes(wifeId)) pHusb.spouses.push(wifeId);
			if (pWife && !pWife.spouses.includes(husbId)) pWife.spouses.push(husbId);
		}
	}

	// Зв'язуємо дітей з батьками
	for (let i = 0; i < familyChildren.length; i++) {
		const fc = familyChildren[i];
		const famId = cleanId(fc[colChild.familyId] || fc.family_id);
		const childId = cleanId(fc[colChild.childId] || fc.child_id);
		const pType = (fc[colChild.pedigreeType] || fc.pedigree_type || "birth").toLowerCase();

		const person = peopleMap.get(childId);
		if (!person) continue;

		const fam = familyMap.get(famId);
		if (!fam) continue;

		const parentIds = [fam.husbId, fam.wifeId].filter(Boolean);

		if (pType === "step") {
			for (const pid of parentIds) {
				if (!person.stepParents.includes(pid)) person.stepParents.push(pid);
			}
		} else {
			// bio або adopted потрапляють в person.parents
			for (const pid of parentIds) {
				if (!person.parents.includes(pid)) person.parents.push(pid);
			}
		}
	}
}
