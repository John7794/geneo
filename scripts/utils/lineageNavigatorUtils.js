// ./scripts/utils/lineageNavigatorUtils.js

export class LineageNavigator {
	static MODE_ROOTS = {
		all: 1,
		father: 2,
		mother: 3,
		fatherFather: 4,
		fatherMother: 5,
		motherFather: 6,
		motherMother: 7,
	};

	constructor(familyData, rootId, engine = null) {
		this.data = familyData || {};
		this.rootId = String(rootId).trim();
		this.mode = "all";
		this.engine = engine;
		this.queue = [];

		this._basicIndex = new Map();
		this._rolesIndex = new Map();
		this._buildIndexes();

		this.ahnentafelMap = this._calculateExactAhnentafel();
		this.refreshQueue();
	}

	_buildIndexes() {
		if (!this.engine?.db) return;

		const db = this.engine.db;

		if (Array.isArray(db.basic)) {
			for (let i = 0; i < db.basic.length; i++) {
				const row = db.basic[i];
				const id = String(row.person_id || row.id || "").trim();
				if (id) this._basicIndex.set(id, row);
			}
		}

		let rolesTable = null;
		for (const key in db) {
			if (key.toLowerCase().replace(/_/g, "") === "familyroles") {
				rolesTable = db[key];
				break;
			}
		}

		if (Array.isArray(rolesTable)) {
			for (let i = 0; i < rolesTable.length; i++) {
				const row = rolesTable[i];
				const id = String(row.person_id || "").trim();
				if (id) this._rolesIndex.set(id, row);
			}
		}
	}

	_isValidNode(id) {
		if (!id) return false;
		const s = String(id).trim();
		// Усунуто дорогий .toLowerCase() для оптимізації GC
		return s !== "" && s !== "null" && s !== "undefined";
	}

	_extractParents(id) {
		let parents = [];
		let foundInRoles = false;
		const cleanId = String(id).trim();

		const roleRow = this._rolesIndex.get(cleanId);
		if (roleRow && roleRow.parents_bio) {
			const bioStr = String(roleRow.parents_bio);
			const semiIndex = bioStr.indexOf(";");
			if (semiIndex !== -1) {
				parents = [
					bioStr.substring(0, semiIndex).trim(),
					bioStr.substring(semiIndex + 1).trim(),
				];
			} else {
				parents = [bioStr.trim(), ""];
			}
			foundInRoles = true;
		}

		if (!foundInRoles) {
			if (this.engine && typeof this.engine.getParents === "function") {
				const engineParents = this.engine.getParents(cleanId) || [];
				if (engineParents.length > 0) return engineParents;
			}
			const person = this.data[cleanId];
			if (person) {
				parents = [person.fatherId || "", person.motherId || ""];
			}
		}

		return parents;
	}

	setMode(newMode) {
		if (LineageNavigator.MODE_ROOTS[newMode] !== undefined) {
			this.mode = newMode;
			this.refreshQueue();
		}
		return this.queue;
	}

	getNextId(currentId) {
		if (this.queue.length === 0) return null;
		const currentIndex = this.queue.indexOf(String(currentId));
		if (currentIndex === -1) return this.queue[0];

		let nextIndex = currentIndex + 1;
		if (nextIndex >= this.queue.length) nextIndex = 0;
		return this.queue[nextIndex];
	}

	getPrevId(currentId) {
		if (this.queue.length === 0) return null;
		const currentIndex = this.queue.indexOf(String(currentId));
		if (currentIndex === -1) return this.queue[this.queue.length - 1];

		let prevIndex = currentIndex - 1;
		if (prevIndex < 0) prevIndex = this.queue.length - 1;
		return this.queue[prevIndex];
	}

	refreshQueue() {
		if (!this.ahnentafelMap) return;

		const targetModeNum = LineageNavigator.MODE_ROOTS[this.mode] || 1;
		const validItems = [];

		const immuneNumbers = new Set();
		let tempNum = targetModeNum;
		while (tempNum >= 1) {
			immuneNumbers.add(tempNum);
			tempNum = Math.floor(tempNum / 2);
		}

		const entries = Array.from(this.ahnentafelMap.entries());
		for (let i = 0; i < entries.length; i++) {
			const [id, data] = entries[i];
			if (!this._isValidNode(id)) continue;

			if (data.branches.has(targetModeNum) || immuneNumbers.has(data.minNum)) {
				validItems.push({ id, sortNum: data.minNum });
			}
		}

		validItems.sort((a, b) => a.sortNum - b.sortNum);

		this.queue = new Array(validItems.length);
		for (let i = 0; i < validItems.length; i++) {
			this.queue[i] = validItems[i].id;
		}
	}

	_getRootBranches(num) {
		const branches = [1];
		if (num <= 1) return branches;

		let d1 = num;
		while (d1 > 3) d1 = Math.floor(d1 / 2);
		branches.push(d1);

		if (num >= 4) {
			let d2 = num;
			while (d2 > 7) d2 = Math.floor(d2 / 2);
			branches.push(d2);
		}
		return branches;
	}

	_calculateExactAhnentafel() {
		const map = new Map();

		if (!this._isValidNode(this.rootId)) return map;

		map.set(this.rootId, { minNum: 1, branches: new Set([1]) });
		const queue = [{ id: this.rootId, num: 1 }];

		let head = 0;
		// Запобіжник цілочисельного переповнення (Max Safe Integer = 2^53 - 1)
		const MAX_DEPTH = 50;

		while (head < queue.length) {
			const { id, num } = queue[head++];

			if (Math.log2(num) > MAX_DEPTH) continue;

			const parents = this._extractParents(id);

			for (let i = 0; i < parents.length; i++) {
				const pId = String(parents[i]).trim();

				if (!pId || pId === "") continue;

				// Броньована перевірка статі замість довіри індексу масиву
				let isMother = false;
				let pNode =
					this.engine?.getPerson?.(pId) ||
					this.data[pId] ||
					this._basicIndex.get(pId);

				if (pNode) {
					const rawGender = String(pNode.gender || pNode.fam_gender || "")
						.trim()
						.toLowerCase();
					if (
						rawGender[0] === "f" ||
						rawGender[0] === "ж" ||
						rawGender === "female"
					) {
						isMother = true;
					} else if (
						rawGender[0] === "m" ||
						rawGender[0] === "ч" ||
						rawGender === "male"
					) {
						isMother = false;
					} else {
						isMother = i === 1;
					}
				} else {
					isMother = i === 1;
				}

				const pNum = isMother ? num * 2 + 1 : num * 2;

				let nodeData = map.get(pId);
				if (!nodeData) {
					nodeData = { minNum: pNum, branches: new Set() };
					map.set(pId, nodeData);
				}

				let isUseful = false;

				if (pNum < nodeData.minNum) {
					nodeData.minNum = pNum;
					isUseful = true;
				}

				const newBranches = this._getRootBranches(pNum);
				for (let bIndex = 0; bIndex < newBranches.length; bIndex++) {
					const b = newBranches[bIndex];
					if (!nodeData.branches.has(b)) {
						nodeData.branches.add(b);
						isUseful = true;
					}
				}

				if (isUseful) {
					queue.push({ id: pId, num: pNum });
				}
			}
		}
		return map;
	}

	buildPath(targetId) {
		if (!this.engine) return [];

		let target = String(targetId).trim();
		const root = String(this.rootId).trim();

		const targetRow = this._basicIndex.get(target);
		if (targetRow) {
			target = String(targetRow.person_id || targetRow.id || target);
		}

		if (target === root) return [this._formatCrumb(root)];

		const queue = [root];
		const visited = new Set([root]);
		const cameFrom = new Map();

		let head = 0;
		let found = false;

		while (head < queue.length) {
			const currentId = queue[head++];

			if (currentId === target) {
				found = true;
				break;
			}

			const parents = this._extractParents(currentId);

			for (let i = 0; i < parents.length; i++) {
				const strPid = String(parents[i]).trim();

				if (!strPid || !this._isValidNode(strPid)) continue;

				if (!visited.has(strPid)) {
					visited.add(strPid);
					cameFrom.set(strPid, currentId);
					queue.push(strPid);
				}
			}
		}

		if (!found) return [this._formatCrumb(target)];

		const pathIds = [];
		let curr = target;
		while (curr !== root) {
			pathIds.push(curr);
			curr = cameFrom.get(curr);
		}
		pathIds.push(root);
		pathIds.reverse();

		const result = new Array(pathIds.length);
		for (let i = 0; i < pathIds.length; i++) {
			result[i] = this._formatCrumb(pathIds[i]);
		}

		return result;
	}

	_formatCrumb(stepId) {
		let realId = String(stepId);
		let name = realId;

		const personRow = this._basicIndex.get(realId);
		if (personRow) {
			realId = String(personRow.person_id || personRow.id || realId);
			const n = personRow.name || "";
			const s = personRow.surname || "";
			if (n && s) name = `${n} ${s}`;
			else if (n) name = n;
			else if (s) name = s;
		}

		let siblings = [{ id: realId, label: name }];

		if (this.engine) {
			const rawParents = this._extractParents(realId);
			const validParents = [];
			for (let i = 0; i < rawParents.length; i++) {
				if (this._isValidNode(rawParents[i])) validParents.push(rawParents[i]);
			}

			if (validParents.length > 0) {
				// Збір нащадків від ОБОХ батьків для врахування напівсиблінгів (зведених)
				const siblingSet = new Set();
				for (let p = 0; p < validParents.length; p++) {
					const rawChildren = this.engine.getChildren(validParents[p]) || [];
					for (let c = 0; c < rawChildren.length; c++) {
						if (this._isValidNode(rawChildren[c])) {
							siblingSet.add(String(rawChildren[c]));
						}
					}
				}

				const validChildren = Array.from(siblingSet);
				siblings = new Array(validChildren.length);

				for (let i = 0; i < validChildren.length; i++) {
					const childId = validChildren[i];
					let cName = childId;

					const childRow = this._basicIndex.get(childId);
					if (childRow) {
						const cn = childRow.name || "";
						const cs = childRow.surname || "";
						if (cn && cs) cName = `${cn} ${cs}`;
						else if (cn) cName = cn;
						else if (cs) cName = cs;
					}

					siblings[i] = { id: childId, label: cName };
				}
			}
		}

		return { id: realId, name, siblings };
	}
}
