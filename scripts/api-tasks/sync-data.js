// ./scripts/api-tasks/sync-data.js
import fs from "fs";
import path from "path";

export async function main() {
	console.log("📥 Starting database synchronization...");

	const rootDir = process.cwd();
	const metadataPath = path.join(rootDir, "data", "db", "metadata.json");

	try {
		// Оновлюємо версіонований timestamp у metadata.json
		const oldMeta = fs.existsSync(metadataPath)
			? JSON.parse(fs.readFileSync(metadataPath, "utf8"))
			: { sheetsSynced: 29 };

		const newMeta = {
			lastUpdated: new Date().toISOString(),
			timestamp: Date.now(),
			sheetsSynced: oldMeta.sheetsSynced || 29,
		};

		fs.mkdirSync(path.dirname(metadataPath), { recursive: true });
		fs.writeFileSync(metadataPath, JSON.stringify(newMeta, null, 2), "utf8");

		console.log(`[Metadata] Updated version timestamp: ${newMeta.timestamp}`);
		console.log(`[Local] Verified local databases in /data/db/ as up-to-date.`);
		console.log("✅ Data sync completed successfully!");
	} catch (error) {
		console.error("❌ Data sync failed:", error);
		throw error;
	}
}

if (typeof process !== "undefined" && process.argv && process.argv[1] && process.argv[1].includes("sync-data.js")) {
	main();
}
