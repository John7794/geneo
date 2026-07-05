import './mock.js';
import fs from 'fs';
import Papa from 'papaparse';
import { findPersonDetails } from './scripts/utils/personUtils.js';
import { enrich, parseKinshipIds } from './scripts/utils/profileUtils.js';
const basicCsv = fs.readFileSync('data/db/uk/basic.csv', 'utf8');
const namesCsv = fs.readFileSync('data/db/uk/names.csv', 'utf8');
const basicData = Papa.parse(basicCsv, { header: true }).data;
const namesData = Papa.parse(namesCsv, { header: true }).data;
const allData = { db: { basic: basicData, names: namesData }, _indexes: {} };
const liteContext = { ...allData.db, engine: allData };

const res = enrich(parseKinshipIds("1020 1021"), liteContext, (p) => (p.gender==='m' ? "father" : "mother"));
console.log(res);
