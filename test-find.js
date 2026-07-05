import './mock.js';
import fs from 'fs';
import Papa from 'papaparse';
import { findPersonDetails } from './scripts/utils/personUtils.js';
const basicCsv = fs.readFileSync('data/db/uk/basic.csv', 'utf8');
const basicData = Papa.parse(basicCsv, { header: true }).data;
const allData = { db: { basic: basicData }, _indexes: {} };
console.log(findPersonDetails("f510_m2", allData));
