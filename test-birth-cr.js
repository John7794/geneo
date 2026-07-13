import fs from 'fs';
import Papa from 'papaparse';

const birthCsv = fs.readFileSync('data/db/uk/birth.csv', 'utf8');
const birthDb = Papa.parse(birthCsv, { header: true, skipEmptyLines: true }).data;

birthDb.forEach(p => {
   if(p["place_id"] && p["place_id"].includes('\r')) {
       console.log("CR in place_id (birth):", JSON.stringify(p["place_id"]));
   }
});
