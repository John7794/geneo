import fs from "fs";
import path from "path";
import Papa from "papaparse";

export async function resolveCoordinates() {
  console.log("🌍 Starting geographical coordinate resolution for places...");
  
  const dataDir = process.env.ACTIVE_DATA_DIR || path.join(process.cwd(), "data");
  const placesPath = path.join(dataDir, "db", "uk", "places.csv");
  const cachePath = path.join(dataDir, "geocache.json");

  if (!fs.existsSync(placesPath)) {
    console.error("❌ places.csv not found at:", placesPath);
    return;
  }

  const csvContent = fs.readFileSync(placesPath, "utf8");
  const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
  const rows = parsed.data;

  let cache = {};
  if (fs.existsSync(cachePath)) {
    try {
      cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    } catch (e) {
      console.warn("⚠️ Could not parse existing geocache.json, starting fresh.");
    }
  }

  let resolvedCount = 0;
  let cachedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const placeId = String(row.place_id || "").trim();
    if (!placeId) continue;

    // Check if already in cache or has valid lat/lng in row
    if (cache[placeId] && cache[placeId].lat && cache[placeId].lng) {
      row.geo_lat = String(cache[placeId].lat);
      row.geo_lng = String(cache[placeId].lng);
      cachedCount++;
      continue;
    }

    if (row.geo_lat && row.geo_lng && !isNaN(parseFloat(row.geo_lat)) && !isNaN(parseFloat(row.geo_lng))) {
      cache[placeId] = {
        lat: parseFloat(row.geo_lat),
        lng: parseFloat(row.geo_lng),
        name: row.name_current || "",
        source: "places_csv",
      };
      cachedCount++;
      continue;
    }

    const url = String(row.google_maps_url || "").trim();
    let coords = null;

    if (url.includes("familio.org")) {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });
        if (res.ok) {
          const html = await res.text();
          const match = html.match(/\[([0-9]{1,3}\.[0-9]+),\s*([0-9]{1,3}\.[0-9]+)\]/);
          if (match) {
            const v1 = parseFloat(match[1]);
            const v2 = parseFloat(match[2]);
            // Coordinates in Europe/Russia: lat is ~44-68, lng is ~18-65
            const lat = v2 > 40 && v2 < 70 ? v2 : v1;
            const lng = v2 > 40 && v2 < 70 ? v1 : v2;
            coords = { lat, lng, source: "familio" };
          }
        }
      } catch (err) {
        // fetch error handled below
      }
    } else if (url.includes("maps.app.goo.gl") || url.includes("google.com/maps")) {
      try {
        const res = await fetch(url, {
          redirect: "follow",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });
        const finalUrl = res.url;
        const m1 = finalUrl.match(/@([0-9.]+),([0-9.]+)/);
        if (m1) {
          coords = { lat: parseFloat(m1[1]), lng: parseFloat(m1[2]), source: "gmaps_at" };
        } else {
          const m2 = finalUrl.match(/!3d([0-9.]+)!4d([0-9.]+)/);
          if (m2) {
            coords = { lat: parseFloat(m2[1]), lng: parseFloat(m2[2]), source: "gmaps_3d4d" };
          }
        }
      } catch (err) {
        // fetch error handled below
      }
    }

    // Fallback: Nominatim OSM
    if (!coords && row.name_current) {
      try {
        const cleanName = row.name_current.replace(/^(м\.|с\.|сел\.|сц\.|п\.)\s*/i, "").trim();
        const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanName)}&format=json&limit=1`;
        const res = await fetch(nomUrl, {
          headers: { "User-Agent": "GeneoApp/1.0 (geneo.project@gmail.com)" },
        });
        if (res.ok) {
          const nomData = await res.json();
          if (Array.isArray(nomData) && nomData.length > 0 && nomData[0].lat && nomData[0].lon) {
            coords = {
              lat: parseFloat(nomData[0].lat),
              lng: parseFloat(nomData[0].lon),
              source: "nominatim",
            };
          }
        }
      } catch (err) {
        // ignore
      }
    }

    if (coords) {
      cache[placeId] = {
        lat: coords.lat,
        lng: coords.lng,
        name: row.name_current || "",
        source: coords.source,
      };
      row.geo_lat = String(coords.lat);
      row.geo_lng = String(coords.lng);
      resolvedCount++;
      console.log(`✅ [${placeId}] ${row.name_current} -> ${coords.lat}, ${coords.lng} (${coords.source})`);
    } else {
      failedCount++;
      console.warn(`⚠️ [${placeId}] Could not resolve coordinates for ${row.name_current} (${url})`);
    }

    // Small polite throttle
    if (i % 5 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }

  // Write geocache.json
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), "utf8");
  console.log(`💾 Saved ${Object.keys(cache).length} locations to ${cachePath}`);

  // Update places.csv with geo_lat / geo_lng
  const updatedCsv = Papa.unparse(rows);
  fs.writeFileSync(placesPath, updatedCsv, "utf8");
  console.log(`💾 Updated places.csv with resolved coordinates. Stats: ${resolvedCount} newly resolved, ${cachedCount} from cache, ${failedCount} unresolved.`);
}

// Auto-run if executed directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  resolveCoordinates().catch((err) => {
    console.error("❌ Coordinate resolution failed:", err);
    process.exit(1);
  });
}
