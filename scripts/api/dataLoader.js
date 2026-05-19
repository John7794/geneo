// ./scripts/api/dataLoader.js

/**
 * Цей модуль відповідає виключно за HTTP-запити,
 * кешування (LocalForage) та парсинг (PapaParse).
 * Він нічого не знає про генеалогію.
 */

const STORE_NAME = "GenealogyApp";
const STORE_VERSION_KEY = "DB_VERSION";
const pendingRequests = new Map();

// Ініціалізація сховища з динамічною назвою для уникнення колізій
if (typeof localforage !== "undefined") {
	localforage.config({
		name: STORE_NAME,
		storeName: "app_data_v2", // 🔥 Змінено назву сховища для примусового скидання кешу старих версій
		description: "Cached genealogy data",
	});
} else {
	console.warn("⚠️ localforage is not defined. Caching will be disabled.");
}

/**
 * Перевірка версії даних на сервері (metadata.json).
 * Якщо версія змінилася — очищує локальний кеш.
 * @returns {Promise<string|number>} Timestamp або ідентифікатор версії
 */
export async function checkDataVersion() {
	let serverVersion = "unknown";

	try {
		// cache-busting запит до metadata.json залишається, оскільки це первинна перевірка
		const response = await fetch(`./data/db/metadata.json?t=${Date.now()}`);

		if (response.ok) {
			const meta = await response.json();
			serverVersion = meta.timestamp || Date.now();

			if (typeof localforage !== "undefined") {
				const localVersion = await localforage.getItem(STORE_VERSION_KEY);

				// 🔥 ЖОРСТКА ІНВАЛІДАЦІЯ КЕШУ
				// Очищуємо, якщо версії відрізняються, АБО якщо версії локально взагалі немає
				if (!localVersion || localVersion !== serverVersion) {
					console.log(
						`♻️ Cache invalidation triggered. Server: ${serverVersion}, Local: ${localVersion || "none"}. Clearing...`,
					);
					await localforage.clear();
					// Записуємо нову версію після повного очищення
					await localforage.setItem(STORE_VERSION_KEY, serverVersion);
				} else {
					console.log(`✅ Data cache is valid (${serverVersion}).`);
				}
			}
		}
	} catch (e) {
		console.warn("⚠️ Metadata check failed. Cache invalidation skipped.", e);
	}

	return serverVersion;
}

/**
 * Завантажує та парсить CSV файл.
 * Використовує глобальну бібліотеку PapaParse у воркері.
 * @param {string} url - Шлях до файлу
 * @returns {Promise<Array>} Масив об'єктів
 */
export async function fetchCsv(url) {
	const cacheKey = url;

	// 1. Спроба взяти з кешу
	if (typeof localforage !== "undefined") {
		try {
			const cached = await localforage.getItem(cacheKey);
			if (cached) return cached;
		} catch (e) {
			// Тихий fail
		}
	}

	// 2. Дедублікація запитів
	if (pendingRequests.has(url)) return pendingRequests.get(url);

	const fetchPromise = (async () => {
		// URL вже містить параметр версії, сформований у модулі api.js
		const response = await fetch(url);

		if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);

		const csvText = await response.text();

		return new Promise((resolve) => {
			if (typeof Papa === "undefined") {
				console.error("❌ PapaParse library not found!");
				resolve([]);
				return;
			}

			Papa.parse(csvText, {
				header: true,
				skipEmptyLines: true,
				worker: true,
				complete: (results) => {
					const data = results.data;
					if (typeof localforage !== "undefined") {
						localforage.setItem(cacheKey, data).catch(() => {});
					}
					resolve(data);
				},
				error: (err) => {
					console.error(`❌ CSV Parse error for ${url}:`, err);
					resolve([]);
				},
			});
		});
	})();

	pendingRequests.set(url, fetchPromise);

	try {
		return await fetchPromise;
	} finally {
		pendingRequests.delete(url);
	}
}

/**
 * Завантажує JSON файл з кешуванням.
 * @param {string} url - Шлях до файлу
 * @returns {Promise<Object>}
 */
export async function fetchJson(url) {
	const cacheKey = url;

	if (typeof localforage !== "undefined") {
		try {
			const cached = await localforage.getItem(cacheKey);
			if (cached) return cached;
		} catch (e) {
			// Тихий fail
		}
	}

	if (pendingRequests.has(url)) return pendingRequests.get(url);

	const fetchPromise = (async () => {
		// URL вже містить параметр версії
		const response = await fetch(url);

		if (!response.ok)
			throw new Error(`JSON HTTP ${response.status} for ${url}`);

		const data = await response.json();

		if (typeof localforage !== "undefined") {
			localforage.setItem(cacheKey, data).catch(() => {});
		}
		return data;
	})();

	pendingRequests.set(url, fetchPromise);

	try {
		return await fetchPromise;
	} finally {
		pendingRequests.delete(url);
	}
}
