import fs from 'fs';
import Papa from 'papaparse';

const birthCsv = fs.readFileSync('data/db/uk/birth.csv', 'utf8');
const birthDb = Papa.parse(birthCsv, { header: true, skipEmptyLines: true }).data;

console.log("place_id of first record:", JSON.stringify(birthDb[0]["place_id"]));
