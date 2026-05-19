// ./scripts/services/spiritualIndexer.js

/**
 * Модуль статичної індексації духовного споріднення.
 * Адаптовано для денормалізованих таблиць та лексичних відхилень (однина/множина).
 */
export class SpiritualIndexer {
	constructor() {
		this.index = new Map();
	}

	/**
	 * Ініціалізація сканування матриці.
	 */
	build(db) {
		this.index.clear();

		if (!db.spiritualKinship || !Array.isArray(db.spiritualKinship)) {
			console.warn("[SpiritualIndexer] Відсутня матриця spiritualKinship.");
			return this;
		}

		for (const row of db.spiritualKinship) {
			const personId = String(row.person_id || "").trim();
			const targetIdsRaw = String(row.target_id || row.target_ids || "").trim();
			const roleCode = String(row.role_code || "")
				.trim()
				.toLowerCase();

			if (!personId || !targetIdsRaw || !roleCode) continue;

			const targetIds = targetIdsRaw
				.split(";")
				.map((id) => id.trim())
				.filter(Boolean);

			for (const tId of targetIds) {
				this._registerLink(personId, tId, roleCode);
				this._buildMirrorLink(tId, personId, roleCode);
			}
		}

		return this;
	}

	/**
	 * Формування ізольованого вузла у хеш-таблиці.
	 * @private
	 */
	_ensureNode(id) {
		if (!this.index.has(id)) {
			this.index.set(id, {
				godparents: [],
				godchildren: [],
				cogodparents: [],
			});
		}
		return this.index.get(id);
	}

	/**
	 * Реєстрація прямого вектора зв'язку.
	 * Додано перехоплення множинних форм.
	 * @private
	 */
	_registerLink(ownerId, targetId, roleCode) {
		const record = this._ensureNode(ownerId);

		if (roleCode === "godfather" || roleCode === "godmother") {
			if (!record.godparents.includes(targetId))
				record.godparents.push(targetId);
		} else if (roleCode === "godchild" || roleCode === "godchildren") {
			if (!record.godchildren.includes(targetId))
				record.godchildren.push(targetId);
		} else if (roleCode === "cogodparent" || roleCode === "cogodparents") {
			if (!record.cogodparents.includes(targetId))
				record.cogodparents.push(targetId);
		}
	}

	/**
	 * Генерація зворотного вектора.
	 * Додано перехоплення множинних форм.
	 * @private
	 */
	_buildMirrorLink(targetId, ownerId, roleCode) {
		const mirrorRecord = this._ensureNode(targetId);

		if (roleCode === "godfather" || roleCode === "godmother") {
			if (!mirrorRecord.godchildren.includes(ownerId))
				mirrorRecord.godchildren.push(ownerId);
		} else if (roleCode === "godchild" || roleCode === "godchildren") {
			if (!mirrorRecord.godparents.includes(ownerId))
				mirrorRecord.godparents.push(ownerId);
		} else if (roleCode === "cogodparent" || roleCode === "cogodparents") {
			if (!mirrorRecord.cogodparents.includes(ownerId))
				mirrorRecord.cogodparents.push(ownerId);
		}
	}

	/**
	 * Отримання структурованого об'єкта духовних зв'язків.
	 */
	getSpiritualData(personId) {
		const idStr = String(personId).trim();
		return this.index.get(idStr) || null;
	}
}
