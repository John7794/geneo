// ./scripts/services/relationshipCalculator.js

import { COLUMNS } from "../core/dbSchema.js";
import {
	generateRelationshipLabel,
	formatGraphNode,
} from "../utils/kinshipUtils.js";

export class RelationshipCalculator {
	constructor(allData) {
		this.db = allData?.db || {};
		this.maxDepth = 9; // Глибина для 7-юрідних

		this.basicMap = new Map();
		if (Array.isArray(this.db.basic)) {
			this.db.basic.forEach((p) =>
				this.basicMap.set(String(p[COLUMNS.basic.id]).trim(), p),
			);
		}
		this.familyMap = new Map();
		if (Array.isArray(this.db.familyList)) {
			this.db.familyList.forEach((p) =>
				this.familyMap.set(String(p[COLUMNS.familyList.id]).trim(), p),
			);
		}
		this.rolesMap = new Map();
		if (Array.isArray(this.db.familyRoles)) {
			this.db.familyRoles.forEach((r) =>
				this.rolesMap.set(String(r[COLUMNS.familyRoles.personId]).trim(), r),
			);
		}
		this.birthMap = new Map();
		if (Array.isArray(this.db.birth)) {
			this.db.birth.forEach((r) =>
				this.birthMap.set(
					String(r[COLUMNS.birth.personId]).trim(),
					r[COLUMNS.birth.year],
				),
			);
		}
		this.deathMap = new Map();
		if (Array.isArray(this.db.deaths)) {
			this.db.deaths.forEach((r) =>
				this.deathMap.set(
					String(r[COLUMNS.death.personId]).trim(),
					r[COLUMNS.death.year],
				),
			);
		}
	}

	isPersonExist(id) {
		return this.basicMap.has(String(id)) || this.familyMap.has(String(id));
	}

	calculate(idA, idB) {
		if (!idA || !idB) return [];

		const pathsA = this._getAllPaths(String(idA).trim());
		const pathsB = this._getAllPaths(String(idB).trim());

		const validGraphs = new Map();

		for (const pA of pathsA) {
			for (const pB of pathsB) {
				const lcaId = pA[pA.length - 1];

				if (lcaId === pB[pB.length - 1]) {
					const topDownA = [...pA].reverse();
					const topDownB = [...pB].reverse();

					const branchA = topDownA.slice(1);
					const branchB = topDownB.slice(1);

					const childA = branchA.length > 0 ? branchA[0] : `DIRECT_A`;
					const childB = branchB.length > 0 ? branchB[0] : `DIRECT_B`;

					// 1. АНТИ-ДРАБИНА
					if (childA === childB && childA !== `DIRECT_A`) continue;

					// 2. ІНТЕЛЕКТУАЛЬНИЙ ПОШУК ПАРИ
					const exactSpouseId = this._getExactSpouse(lcaId, childA, childB);
					const rootGroupIds = [lcaId, exactSpouseId].filter(Boolean).sort();

					// 3. УНІКАЛЬНА СИГНАТУРА (з нормалізацією DIRECT)
					// Саме це гарантує, що різні матері утворять n окремих прямих гілок
					const normA = childA.startsWith("DIRECT") ? "DIRECT" : childA;
					const normB = childB.startsWith("DIRECT") ? "DIRECT" : childB;
					const childrenForSig = [normA, normB].sort();

					const signatureKey = `${rootGroupIds.join("_")}_${childrenForSig[0]}_${childrenForSig[1]}`;
					const dist = branchA.length + branchB.length;

					if (
						!validGraphs.has(signatureKey) ||
						validGraphs.get(signatureKey).dist > dist
					) {
						validGraphs.set(signatureKey, {
							rootIds: rootGroupIds,
							meIds: branchA,
							relIds: branchB,
							dist: dist,
						});
					}
				}
			}
		}

		if (validGraphs.size === 0) return [];

		const results = Array.from(validGraphs.values()).map((graph) => {
			const rootNodes = graph.rootIds
				.map((id) => this._node(id))
				.sort((a, b) => (a.gender === "f" ? 1 : -1)); // Чоловік зліва, жінка справа

			const mainNodes = graph.meIds.map((id) => this._node(id));
			const sideNodes = graph.relIds.map((id) => this._node(id));

			const genderA = this._getGender(idA);
			const genderB = this._getGender(idB);

			// Повертаємо класичну структуру, на яку очікує старий RelationshipManager
			return {
				root: rootNodes,
				branch: { main: mainNodes, side: sideNodes },
				dist: graph.dist,
				info: {
					targetToIndirect: generateRelationshipLabel(
						mainNodes.length,
						sideNodes.length,
						genderB,
					),
					indirectToTarget: generateRelationshipLabel(
						sideNodes.length,
						mainNodes.length,
						genderA,
					),
					meToIndirect: generateRelationshipLabel(
						sideNodes.length,
						mainNodes.length,
						genderA,
					),
					indirectToMe: generateRelationshipLabel(
						mainNodes.length,
						sideNodes.length,
						genderB,
					),
				},
			};
		});

		return results.sort((a, b) => a.dist - b.dist);
	}

	_getExactSpouse(parentId, childA, childB) {
		const getOtherParent = (childId) => {
			if (String(childId).startsWith("DIRECT")) return null;
			const parents = this._getParents(childId);
			return parents.find((p) => String(p) !== String(parentId)) || null;
		};

		const spouseA = getOtherParent(childA);
		const spouseB = getOtherParent(childB);

		// Якщо діти від ОДНІЄЇ матері - показуємо її у корені
		if (spouseA && spouseB && spouseA === spouseB) return spouseA;

		// Якщо діти від РІЗНИХ матерів (зведені брати/сестри) - відсікаємо дружину,
		// це збудує одну паралельну гілку від батька (дві різні гілки вниз)
		if (spouseA && spouseB && spouseA !== spouseB) return null;

		// 🔥 ПРАВИЛО ДЛЯ ПРЯМИХ ПРАЩУРІВ:
		// Якщо шлях прямий (DIRECT), ми зберігаємо матір! Це створить окрему
		// монолінійну вкладку для кожної дружини-пращура.
		if (spouseA && String(childB).startsWith("DIRECT")) return spouseA;
		if (spouseB && String(childA).startsWith("DIRECT")) return spouseB;

		if (spouseA !== spouseB) return null;

		// Фоллбек
		const strId = String(parentId).trim();
		if (this.rolesMap.has(strId)) {
			const raw = this.rolesMap.get(strId)[COLUMNS.familyRoles.spouses];
			if (raw)
				return (
					String(raw)
						.split(/[;,\s]+/)
						.map((s) => s.trim())
						.find((s) => s && s !== "0" && s !== strId) || null
				);
		}
		return null;
	}

	_node(id) {
		return formatGraphNode(
			id,
			this.basicMap,
			this.familyMap,
			this.birthMap,
			this.deathMap,
		);
	}

	_getAllPaths(startId) {
		const results = [];
		const queue = [[String(startId).trim()]];
		let safetyCounter = 0;

		while (queue.length > 0) {
			safetyCounter++;
			if (safetyCounter > 50000) break;

			const path = queue.shift();
			const currentId = path[path.length - 1];

			results.push(path);

			if (path.length >= this.maxDepth) continue;

			const parents = this._getParents(currentId);
			for (let p of parents) {
				p = String(p).trim();
				if (!path.includes(p)) {
					queue.push([...path, p]);
				}
			}
		}
		return results;
	}

	_getParents(id) {
		const parents = [];
		const strId = String(id).trim();

		const addFromString = (str) => {
			if (!str) return;
			String(str)
				.split(/[;,\s]+/)
				.map((s) => s.trim())
				.filter((s) => s !== "" && s !== "0")
				.forEach((pId) => {
					if (!parents.includes(pId)) parents.push(pId);
				});
		};

		if (this.rolesMap.has(strId))
			addFromString(this.rolesMap.get(strId)[COLUMNS.familyRoles.parentsBio]);

		if (parents.length === 0 && this.basicMap.has(strId)) {
			const p = this.basicMap.get(strId);
			if (p[COLUMNS.basic.fatherId])
				parents.push(String(p[COLUMNS.basic.fatherId]));
			if (p[COLUMNS.basic.motherId])
				parents.push(String(p[COLUMNS.basic.motherId]));
		}

		if (parents.length === 0 && this.familyMap.has(strId)) {
			addFromString(this.familyMap.get(strId)[COLUMNS.familyList.parents]);
		}
		return parents;
	}

	_getGender(id) {
		const strId = String(id).trim();
		if (this.basicMap.has(strId))
			return this.basicMap.get(strId)[COLUMNS.basic.gender];
		if (this.familyMap.has(strId))
			return this.familyMap.get(strId)[COLUMNS.familyList.gender];
		return "m";
	}
}
