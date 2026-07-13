import fs from 'fs';
import Papa from 'papaparse';

const placesCsv = fs.readFileSync('data/db/uk/places.csv', 'utf8');
const placesDb = Papa.parse(placesCsv, { header: true, skipEmptyLines: true }).data;

const placeNameMap = {};
placesDb.forEach(p => {
    placeNameMap[p["place_id"]] = p["name_current"] || p["name_hist"] || "Невідомо";
});

console.log("UA_SIL in places:", placeNameMap["UA_SIL"]);
