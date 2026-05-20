import fs from 'fs';
import Papa from 'papaparse';

const csv = fs.readFileSync('data/db/uk/basic.csv', 'utf8');
const results = Papa.parse(csv, { header: true, skipEmptyLines: true });
console.log(results.data[0]);
