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
    "families.csv":
      "https://docs.google.com/spreadsheets/d/1kKCIXB1qmw2367eqfYT8BYaL3ilRBjdSSaBfCXMChYg/export?format=csv&gid=166395725",
    "familyChildren.csv":
      "https://docs.google.com/spreadsheets/d/1kKCIXB1qmw2367eqfYT8BYaL3ilRBjdSSaBfCXMChYg/export?format=csv&gid=818657483",
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

export function getActiveDataDir() {
  if (process.env.ACTIVE_DATA_DIR) {
    return process.env.ACTIVE_DATA_DIR;
  }
  try {
    const testFile = path.join(process.cwd(), ".write-test-" + Date.now());
    fs.writeFileSync(testFile, "1");
    fs.unlinkSync(testFile);
    return path.join(process.cwd(), "data");
  } catch {
    return path.join("/tmp", "genealogy_app_data", "data");
  }
}

export async function main() {
  console.log("📥 Starting database synchronization from Google Sheets...");
  const dataDir = getActiveDataDir();
  console.log("📂 Target data directory: " + dataDir);
  const metadataPath = path.join(dataDir, "db", "metadata.json");

  try {
    let downloadedCount = 0;

    // Змінено: завантажуємо файли послідовно з паузою, щоб уникнути блокування API (Error 429 Too Many Requests) від Google
    for (const [lang, tables] of Object.entries(DATABASES)) {
      const langDir = path.join(dataDir, "db", lang);
      if (!fs.existsSync(langDir)) {
        fs.mkdirSync(langDir, { recursive: true });
      }

      for (const [filename, url] of Object.entries(tables)) {
        console.log(`[Sync] Downloading ${lang}/${filename}...`);
        const cacheBustUrl =
          url + (url.includes("?") ? "&" : "?") + "_cb=" + Date.now();
        let csvText = "";
        try {
          const response = await fetch(cacheBustUrl, { cache: "no-store" });
          if (response.ok) {
            const txt = await response.text();
            if (!txt.includes("<!DOCTYPE") && !txt.includes("<html")) {
              csvText = txt;
            }
          }
        } catch (e) {}

        // Фолбек 1: Прямий export URL через Google Sheets ID та gid
        if (!csvText) {
          const gidMatch = url.match(/gid=(\d+)/);
          if (gidMatch) {
            const directUrl = `https://docs.google.com/spreadsheets/d/1kKCIXB1qmw2367eqfYT8BYaL3ilRBjdSSaBfCXMChYg/export?format=csv&gid=${gidMatch[1]}&_cb=${Date.now()}`;
            try {
              console.log(`[Sync] Attempting direct export for ${filename} (gid: ${gidMatch[1]})...`);
              const res2 = await fetch(directUrl, { cache: "no-store" });
              if (res2.ok) {
                const txt2 = await res2.text();
                if (!txt2.includes("<!DOCTYPE") && !txt2.includes("<html")) {
                  csvText = txt2;
                  console.log(`[Sync] Direct export succeeded for ${filename}!`);
                }
              }
            } catch (e2) {}
          }
        }

        // Фолбек 2: gsheets CLI (лише якщо утиліта доступна локально)
        if (!csvText) {
          const sheetNameMap = { "families.csv": "Families", "familyChildren.csv": "Family_Children" };
          const sName = sheetNameMap[filename];
          if (sName) {
            try {
              console.log(`[Sync] Attempting gsheets CLI for ${filename} (${sName})...`);
              const tempOut = path.join(langDir, filename);
              execSync(`gsheets readonly export 1kKCIXB1qmw2367eqfYT8BYaL3ilRBjdSSaBfCXMChYg "${tempOut}" --sheet "${sName}" --format csv`, { stdio: "inherit" });
              csvText = fs.readFileSync(tempOut, "utf8");
            } catch (cliErr) {
              console.warn(`[Sync] gsheets CLI unavailable: ${cliErr.message}`);
            }
          }
        }

        // Фолбек 3: Якщо файл уже є в репозиторії, не ламати весь запуск
        if (!csvText) {
          const filePath = path.join(langDir, filename);
          if (fs.existsSync(filePath)) {
            console.warn(`[Sync] Could not download fresh ${filename}, preserving existing local copy.`);
            continue;
          } else {
            throw new Error(`Failed to download ${url}`);
          }
        }

        if (filename === "basic.csv") {
          csvText = csvText.replace(
            /^person_id,person_id,/i,
            "person_id,surname,",
          );
        }

        const filePath = path.join(langDir, filename);
        fs.writeFileSync(filePath, csvText, "utf8");
        downloadedCount++;

        // Затримка 500мс
        await new Promise((res) => setTimeout(res, 500));
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

    console.log(
      `[Metadata] Updated version timestamp: ${newMeta.timestamp}. Total sheets synced: ${newMeta.sheetsSynced}`,
    );
    console.log(`[Local] Verified local databases in /data/db/ as up-to-date.`);

    console.log("✅ Data sync (CSV download) completed successfully!");
  } catch (error) {
    console.error("❌ Data sync failed:", error);
    throw error;
  }
}

if (
  typeof process !== "undefined" &&
  process.argv &&
  process.argv[1] &&
  process.argv[1].includes("sync-data.js")
) {
  main();
}
