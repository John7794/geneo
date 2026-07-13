import fs from 'fs';
import Papa from 'papaparse';

const placesCsv = fs.readFileSync('data/db/uk/places.csv', 'utf8');
const placesDb = Papa.parse(placesCsv, { header: true, skipEmptyLines: true }).data;

placesDb.forEach(p => {
   if(p["place_id"].includes('\r')) {
       console.log("CR in place_id:", JSON.stringify(p["place_id"]));
   }
});
