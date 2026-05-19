// ./scripts/api/api.js

import { i18n } from "../core/i18n.js";
import { DATA_FILES } from "../core/dbSchema.js";
import { FamilyEngine } from "../services/familyEngine.js";
import { checkDataVersion, fetchCsv, fetchJson } from "./dataLoader.js";

/**
 * MAIN DATA FETCH FUNCTION
 * Оркестрація завантаження системних файлів та ініціалізація логічного ядра.
 */
export async function fetchAllData() {
	const lang = i18n.lang;
	console.log(`🌍 Fetching data for language: [${lang}]`);

	const version = await checkDataVersion();

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

	const kinshipUrl = `./data/kinshipIndex.json?v=${version}`;
	const kinshipPromise = fetchJson(kinshipUrl).catch((err) => {
		console.warn(`⚠️ Kinship index missing or error.`, err);
		return {};
	});

	const [fileResults, kinshipData] = await Promise.all([
		Promise.all(filePromises),
		kinshipPromise,
	]);

	const db = Object.fromEntries(fileResults);

	console.log("⚙️ Initializing FamilyEngine...");
	try {
		const engine = new FamilyEngine(
			db.basic || [],
			db.familyList || [],
			db.familyRoles || [],
			db,
			kinshipData,
		);

		console.log(
			`🚀 FamilyEngine ready. Profiles loaded: ${engine.people?.size || 0}`,
		);
		return engine;
	} catch (e) {
		console.error("❌ Critical Error: FamilyEngine failed to initialize", e);
		return null;
	}
}
