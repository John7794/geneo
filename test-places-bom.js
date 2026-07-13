import fs from 'fs';
import Papa from 'papaparse';

const placesCsv = fs.readFileSync('data/db/uk/places.csv', 'utf8');
const placesDb = Papa.parse(placesCsv, { header: true, skipEmptyLines: true }).data;

console.log(Object.keys(placesDb[0]));
