// ./scripts/api/api.js

import { i18n } from "../core/i18n.js";
import { DATA_FILES } from "../core/dbSchema.js";
import { FamilyEngine } from "../services/familyEngine.js";
import { checkDataVersion, fetchCsv, fetchJson } from "./dataLoader.js";

/**
 * MAIN DATA FETCH FUNCTION
 * Оркестрація завантаження системних файлів та ініціалізація логічного ядра.
 * Оптимізовано: повне кешування kinship.json у IndexedDB, паралельне завантаження.
 */
export async function fetchAllData(userConfig = {}) {
	const lang = i18n.lang;

	const version = await checkDataVersion();

	// 1. Паралельне завантаження 29 CSV таблиць із вбудованим localforage-кешуванням
	const filePromises = Object.entries(DATA_FILES).map(
		async ([key, filename]) => {
			const url = `./data/db/${lang}/${filename}?v=${version}`;
			try {
				const data = await fetchCsv(url);
				return [key, data];
			} catch (error) {
				console.error(`❌ Failed to load ${key} (${url}):`, error);
				return [key, []];
			}
		},
	);

	// 2. Оптимізоване завантаження kinship.json з IndexedDB кешем
	const kinshipPromise = (async () => {
		const cacheKey = `kinship_index_v${version}`;

		// Спроба взяти миттєво з IndexedDB
		if (typeof localforage !== "undefined") {
			try {
				const cached = await localforage.getItem(cacheKey);
				if (cached && typeof cached === "object" && Object.keys(cached).length > 0) {
					return cached;
				}
			} catch (e) {
				console.warn("Помилка читання kinship з localforage:", e);
			}
		}

		// Якщо в кеші немає або версія оновилася — завантажуємо через мережу
		try {
			// Спочатку пробуємо прямий статичний файл, якщо ні — API
			let res = await fetch(`./data/kinship.json?v=${version}`, {
				headers: { "Accept": "application/json" }
			});
			if (!res.ok) {
				res = await fetch(`/api/data/kinship?v=${version}`);
			}
			if (!res.ok) throw new Error("HTTP " + res.status);
			
			let text = await res.text();
			let parsedData;

			try {
				parsedData = JSON.parse(text);
			} catch (e1) {
				try {
					text = text.replace(/[\x00-\x1F]/g, "");
					parsedData = JSON.parse(text);
				} catch (e2) {
					throw e2;
				}
			}

			// Зберігаємо свіжу версію в IndexedDB
			if (typeof localforage !== "undefined" && parsedData) {
				localforage.setItem(cacheKey, parsedData).catch(() => {});
				
				// Очищаємо старі версії kinship
				try {
					const keys = await localforage.keys();
					for (const k of keys) {
						if (k.startsWith("kinship_index_v") && k !== cacheKey) {
							await localforage.removeItem(k);
						}
					}
				} catch (errClean) {}
			}

			return parsedData || {};
		} catch (err) {
			console.warn(`⚠️ Kinship index parse/fetch error:`, err);
			return {};
		}
	})();

	const [fileResults, kinshipData] = await Promise.all([
		Promise.all(filePromises),
		kinshipPromise,
	]);

	const db = Object.fromEntries(fileResults);

	// Фільтрація прихованих профілів
	const hiddenProfiles = userConfig.hiddenProfiles || [];
	if (hiddenProfiles.length > 0) {
		const hideSet = new Set(hiddenProfiles.map(String));

		const tablesToFilterByPid = [
			'basic',
			'identity',
			'familyRoles',
			'personal',
			'names',
			'education',
			'job',
			'military'
		];

		tablesToFilterByPid.forEach((table) => {
			if (db[table]) {
				db[table] = db[table].filter((row) => !hideSet.has(String(row.pid)));
			}
		});

		if (db.familyList) {
			db.familyList = db.familyList.filter(
				(row) => !hideSet.has(String(row.fam_id)) && !hideSet.has(String(row.id)),
			);
		}
	}

	try {
		const engine = new FamilyEngine(
			db.basic || [],
			db.familyList || [],
			db.familyRoles || [],
			db,
			kinshipData,
		);

		return engine;
	} catch (e) {
		console.error("❌ Critical Error: FamilyEngine failed to initialize", e);
		return null;
	}
}
