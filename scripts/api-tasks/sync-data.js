import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const DATABASES = {
	uk: {
		"basic.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=2118841212&single=true&output=csv",
		"names.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=12624007&single=true&output=csv",
		"birth.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=1233647730&single=true&output=csv",
		"baptism.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=1911439411&single=true&output=csv",
		"marriage.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=966981399&single=true&output=csv",
		"death.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=1601676617&single=true&output=csv",
		"funeral.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=2108022299&single=true&output=csv",
		"familyList.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=1603507541&single=true&output=csv",
		"familyRoles.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=1655707936&single=true&output=csv",
		"events.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=1891330957&single=true&output=csv",
		"participants.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=1753291378&single=true&output=csv",
		"places.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=539840456&single=true&output=csv",
		"churches.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=239037630&single=true&output=csv",
		"churchAdminHistory.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=954501947&single=true&output=csv",
		"cemeteries.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=639926550&single=true&output=csv",
		"coats.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=838827129&single=true&output=csv",
		"records.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=699527075&single=true&output=csv",
		"archives.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=466312717&single=true&output=csv",
		"placeNamesHistory.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=354528464&single=true&output=csv",
		"flagsHistory.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=1058290351&single=true&output=csv",
		"education.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=876211625&single=true&output=csv",
		"job.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=1936529725&single=true&output=csv",
		"awards.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=1039738551&single=true&output=csv",
		"military.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=643575509&single=true&output=csv",
		"gallery.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=644155002&single=true&output=csv",
		"identity.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=214835027&single=true&output=csv",
		"domicile.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=932109326&single=true&output=csv",
		"personal.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=977988&single=true&output=csv",
		"spiritualKinship.csv":
			"https://docs.google.com/spreadsheets/d/e/2PACX-1vTCPg7JuDAFeViBOB5Yt7RDHQdIuhxgVXpkpdLzyGSbur7nqder5YTSlpuEUJ5DQ47zaDEDV7-tIVBj/pub?gid=1654837105&single=true&output=csv",
	},
};

export async function main() {
	console.log("📥 Starting database synchronization from Google Sheets...");

	const rootDir = process.cwd();
	const metadataPath = path.join(rootDir, "data", "db", "metadata.json");

	try {
		let downloadedCount = 0;

		for (const [lang, tables] of Object.entries(DATABASES)) {
			const langDir = path.join(rootDir, "data", "db", lang);
			if (!fs.existsSync(langDir)) {
				fs.mkdirSync(langDir, { recursive: true });
			}

			for (const [filename, url] of Object.entries(tables)) {
				console.log(`[Sync] Downloading ${lang}/${filename}...`);
				const response = await fetch(url);
				if (!response.ok) {
					throw new Error(`Failed to download ${url}: ${response.statusText}`);
				}
				let csvText = await response.text();
				
				if (filename === 'basic.csv') {
					csvText = csvText.replace(/^person_id,person_id,/i, 'person_id,surname,');
				}

				const filePath = path.join(langDir, filename);
				fs.writeFileSync(filePath, csvText, "utf8");
				downloadedCount++;
			}
		}

		// Оновлюємо версіонований timestamp у metadata.json
		const oldMeta = fs.existsSync(metadataPath)
			? JSON.parse(fs.readFileSync(metadataPath, "utf8"))
			: { sheetsSynced: 0 };

		const newMeta = {
			lastUpdated: new Date().toISOString(),
			timestamp: Date.now(),
			sheetsSynced: downloadedCount,
		};

		fs.mkdirSync(path.dirname(metadataPath), { recursive: true });
		fs.writeFileSync(metadataPath, JSON.stringify(newMeta, null, 2), "utf8");

		console.log(`[Metadata] Updated version timestamp: ${newMeta.timestamp}. Total sheets synced: ${newMeta.sheetsSynced}`);
		console.log(`[Local] Verified local databases in /data/db/ as up-to-date.`);
		
		console.log("⚙️ Running kinship index generation...");
		execSync("npx tsx scripts/api-tasks/generate-kinship.js", { stdio: "inherit" });

		console.log("✅ Data sync and kinship index compilation completed successfully!");
	} catch (error) {
		console.error("❌ Data sync failed:", error);
		throw error;
	}
}

if (typeof process !== "undefined" && process.argv && process.argv[1] && process.argv[1].includes("sync-data.js")) {
	main();
}
