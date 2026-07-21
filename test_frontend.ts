import fs from 'fs';
import Papa from 'papaparse';

(globalThis as any).window = {};
(globalThis as any).localStorage = {
	getItem: () => null,
	setItem: () => {}
};
global.localStorage = (globalThis as any).localStorage;

import { findPersonDetails } from './scripts/utils/personUtils.js';

const familyListText = fs.readFileSync('./data/db/uk/familyList.csv', 'utf8');
const familyListRows = Papa.parse(familyListText, { header: true, skipEmptyLines: true }).data;

const allData = {
	db: {
		basic: [],
		familyList: familyListRows
	},
	_indexes: {}
};

const details = findPersonDetails('f28_s1_1', allData);
console.log("DETAILS:", details);
