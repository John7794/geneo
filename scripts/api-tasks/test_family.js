import fs from "fs";
import path from "path";
import Papa from "papaparse";

const rootDir = process.cwd();
const familyListPath = path.join(rootDir, "data", "db", "uk", "familyList.csv");

const content = fs.readFileSync(familyListPath, "utf8");
const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
console.log("f28_s1_1 rows in familyList:", parsed.data.filter(r => r.fam_id === 'f28_s1_1' || r.id === 'f28_s1_1' || r.person_id === 'f28_s1_1'));
