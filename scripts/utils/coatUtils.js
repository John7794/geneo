// ./scripts/utils/coatUtils.js

import { COLUMNS } from "../core/dbSchema.js";
import { APP_CONFIG, COATS_MAP } from "../core/appConfig.js";

// Прекомпіляція регулярних виразів
const ABSOLUTE_URL_REGEX = /^(https?|ftp):\/\//i;
const FILE_EXTENSION_REGEX = /\.(svg|png|jpg|jpeg)$/i;

/**
 * Побудова індексу хеш-таблиці.
 * Трансформація O(N) в O(1) з використанням ізольованої структури Map.
 */
export function createCoatsLookup(coatsRaw) {
	const lookup = new Map();
	if (!Array.isArray(coatsRaw)) return lookup;

	const nameCol = COLUMNS.coats?.name || "coat_of_arms";
	const urlCol = COLUMNS.coats?.url || "coat_of_arms_url";

	for (let i = 0; i < coatsRaw.length; i++) {
		const item = coatsRaw[i];
		const name = item[nameCol];
		const url = item[urlCol];

		if (name && url) {
			lookup.set(String(name).trim().toLowerCase(), String(url).trim());
		}
	}
	return lookup;
}

/**
 * Видобування URL герба за сталий час O(1).
 * Підтримує ліниву ініціалізацію індексів.
 */
export function resolveCoatUrl(coatName, ctx) {
	if (!coatName) return null;

	const cleanName = String(coatName).trim().toLowerCase();
	if (!cleanName) return null;

	let rawUrl = null;

	if (ctx?.coatsLookup instanceof Map) {
		rawUrl = ctx.coatsLookup.get(cleanName);
	} else if (ctx && Array.isArray(ctx.coats || ctx.coatList)) {
		// Лінива ініціалізація індексу у пам'яті з перевіркою наявності об'єкта ctx
		const sourceArray = ctx.coats || ctx.coatList;
		ctx.coatsLookup = createCoatsLookup(sourceArray);
		rawUrl = ctx.coatsLookup.get(cleanName);
	}

	// Фолбек до статичної конфігурації
	if (!rawUrl && COATS_MAP && COATS_MAP[cleanName]) {
		rawUrl = COATS_MAP[cleanName];
	}

	if (!rawUrl) return null;

	rawUrl = String(rawUrl).trim();

	// Перевірка на абсолютний URL
	if (ABSOLUTE_URL_REGEX.test(rawUrl)) {
		return rawUrl;
	}

	// 🔥 ВИПРАВЛЕНО: Зберігаємо оригінальний регістр файлу
	const basePath = APP_CONFIG.coatBasePath || "";
	const targetExt = APP_CONFIG.coatExtension;

	// 🔥 ВИПРАВЛЕНО: Відрізаємо старе розширення ТІЛЬКИ якщо конфіг примусово задає нове
	if (targetExt) {
		const cleanFileName = rawUrl.replace(FILE_EXTENSION_REGEX, "");
		return `${basePath}${cleanFileName}${targetExt}`;
	}

	// Якщо глобального розширення немає, віддаємо файл як є (з його рідним розширенням)
	return `${basePath}${rawUrl}`;
}
