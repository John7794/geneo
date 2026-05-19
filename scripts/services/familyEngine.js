// ./scripts/services/familyEngine.js

import {
	findSiblings,
	findGrandparents,
	calculateComplexRelationship,
} from "../utils/kinshipUtils.js";
import {
	loadPeopleMap,
	linkRelationships,
	buildChildrenIndex,
	buildEventsIndex,
} from "../utils/processorUtils.js";
import { buildChurchIndexes } from "../utils/churchUtils.js";
import { buildGeoIndexes } from "../utils/geoUtils.js";

export class FamilyEngine {
	constructor(
		basicData = [],
		familyListData = [],
		rolesData = [],
		fullDb = {},
		kinshipData = {},
	) {
		this.db = fullDb;
		this.kinship = kinshipData || {};

		const safeEvents = fullDb?.events || [];

		// 1. Завантаження (Parsers)
		this.people = loadPeopleMap(basicData, familyListData);
		linkRelationships(this.people, rolesData);

		// 2. Індексація (Processors)
		this.childrenIndex = buildChildrenIndex(this.people);
		this.eventsIndex = buildEventsIndex(safeEvents);

		// Розщеплення об'єкта бази для цільового прекомпілятора
		this.churchIndexes = buildChurchIndexes(
			fullDb?.churches || [],
			fullDb?.churchAdminHistory || [],
		);

		// Кешування просторово-часових структур
		this.geoIndexes = buildGeoIndexes(fullDb);
	}

	// --- Basic Getters ---

	getPerson(id) {
		if (!id) return null;
		// Сувора нормалізація ключа для O(1) доступу
		return this.people.get(String(id).trim()) || null;
	}

	getParents(id) {
		return this.getPerson(id)?.parents || [];
	}

	getChildren(id) {
		if (!id) return [];
		return this.childrenIndex.get(String(id).trim()) || [];
	}

	getSpouses(id) {
		return this.getPerson(id)?.spouses || [];
	}

	// --- Smart Getters (Delegated to kinshipUtils.js) ---

	getSiblingsDetailed(id) {
		return findSiblings(this, id);
	}

	getGrandparents(id) {
		return findGrandparents(this, id);
	}

	// --- Complex Math (Delegated to kinshipUtils.js) ---

	calculateRelationship(idA, idB) {
		return calculateComplexRelationship(this, idA, idB);
	}

	// --- Memory Management ---

	/**
	 * Примусове вивільнення оперативної пам'яті (Garbage Collection Trigger).
	 * Викликати перед знищенням екземпляра рушія в SPA-архітектурі.
	 */
	destroy() {
		if (this.people) this.people.clear();
		if (this.childrenIndex) this.childrenIndex.clear();

		this.eventsIndex = null;
		this.churchIndexes = null;
		this.geoIndexes = null;
		this._indexes = null;
		this.db = null;
		this.kinship = null;
	}
}
