import { findPersonDetails } from './scripts/utils/personUtils.js';
import fs from 'fs';
import Papa from 'papaparse';

const basicCsv = fs.readFileSync('/tmp/data/db/uk/basic.csv', 'utf8');
const namesCsv = fs.readFileSync('/tmp/data/db/uk/names.csv', 'utf8');

const basicData = Papa.parse(basicCsv, { header: true }).data;
const namesData = Papa.parse(namesCsv, { header: true }).data;

const allData = {
  db: {
    basic: basicData,
    names: namesData
  }
};

const res = findPersonDetails('511', allData);
console.log(res);
