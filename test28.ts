import './mock.ts';
import { FamilyEngine } from "./scripts/services/familyEngine.js";
import { buildPersonObject } from "./scripts/services/processor.js";
import fs from 'fs';
import Papa from 'papaparse';

const basic = Papa.parse(fs.readFileSync('./data/db/uk/basic.csv', 'utf8'), {header: true, skipEmptyLines: true}).data;
const familyList = Papa.parse(fs.readFileSync('./data/db/uk/familyList.csv', 'utf8'), {header: true, skipEmptyLines: true}).data;
const familyRoles = Papa.parse(fs.readFileSync('./data/db/uk/familyRoles.csv', 'utf8'), {header: true, skipEmptyLines: true}).data;
const kinshipIndex = JSON.parse(fs.readFileSync('./data/kinshipIndex.json', 'utf8'));

const db = { basic, familyList, familyRoles };
const engine = new FamilyEngine(basic, familyList, familyRoles, db, kinshipIndex);

const allData = { db, _indexes: engine._indexes, _spiritualIndex: engine._spiritualIndex, kinship: kinshipIndex, engine };

const personData = buildPersonObject('28', allData);
console.log("28 Marriages length:", personData._family.marriage.length);
if (personData._family.marriage.length > 0) {
	console.log("28 bio children of first marriage:", personData._family.marriage[0].children.bio.map(c => c.id));
}
