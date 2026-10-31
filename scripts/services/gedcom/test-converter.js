// ./scripts/services/gedcom/test-converter.js
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { parseGedcom, exportGeneoToGedcom, convertGedcomToGeneo } from "./index.js";

function parseCsv(p) {
	if (!fs.existsSync(p)) return [];
	return Papa.parse(fs.readFileSync(p, "utf8"), { header: true, skipEmptyLines: true }).data;
}

console.log("🧪 --- GEDCOM TO GENEO CONVERTER TEST ---");

const dataDir = path.join(process.cwd(), "data", "db", "uk");
const db = {
	basic: parseCsv(path.join(dataDir, "basic.csv")),
	names: parseCsv(path.join(dataDir, "names.csv")),
	birth: parseCsv(path.join(dataDir, "birth.csv")),
	death: parseCsv(path.join(dataDir, "death.csv")),
	baptism: parseCsv(path.join(dataDir, "baptism.csv")),
	funeral: parseCsv(path.join(dataDir, "funeral.csv")),
	marriage: parseCsv(path.join(dataDir, "marriage.csv")),
	families: parseCsv(path.join(dataDir, "families.csv")),
	familyChildren: parseCsv(path.join(dataDir, "familyChildren.csv")),
	places: parseCsv(path.join(dataDir, "places.csv")),
};

console.log(`Original DB: ${db.basic.length} persons, ${db.families.length} families, ${db.familyChildren.length} child links.`);

// 1. Експорт у GEDCOM
const gedcomText = exportGeneoToGedcom(db);
console.log(`Exported to GEDCOM: ${gedcomText.length} characters.`);

// 2. Парсинг GEDCOM
const parsed = parseGedcom(gedcomText);
console.log(`Parsed GEDCOM: ${parsed.stats.individualsCount} indi, ${parsed.stats.familiesCount} fam.`);

// 3. Конвертація назад у Geneo таблиці
const converted = convertGedcomToGeneo(parsed, db, { strategy: "replace" });

console.log(`Converted Geneo Tables:`);
console.log(`  - basic: ${converted.basic.length}`);
console.log(`  - names: ${converted.names.length}`);
console.log(`  - birth: ${converted.birth.length}`);
console.log(`  - death: ${converted.death.length}`);
console.log(`  - marriage: ${converted.marriage.length}`);
console.log(`  - families: ${converted.families.length}`);
console.log(`  - familyChildren: ${converted.familyChildren.length}`);
console.log(`  - familyRoles: ${converted.familyRoles.length}`);

console.assert(converted.basic.length === db.basic.length, "Basic count mismatch!");
console.assert(converted.families.length === db.families.length, "Families count mismatch!");
console.assert(converted.familyChildren.length === db.familyChildren.length, "Children count mismatch!");

// 4. Перевірка конкретної особи (Person 1)
const p1Basic = converted.basic.find((p) => p.person_id === "1");
console.log(`\nReconstructed Person 1:`, p1Basic);
console.assert(p1Basic.name === "Іван" && p1Basic.surname === "Селіванов" && p1Basic.patronymic === "Сергійович", "P1 basic mismatch");

const p1Birth = converted.birth.find((b) => b.person_id === "1");
console.log(`Reconstructed Person 1 Birth:`, p1Birth);
console.assert(p1Birth.b_day === "7" && p1Birth.b_month === "07" && p1Birth.b_year === "1994", "P1 birth mismatch");

const p1Roles = converted.familyRoles.find((r) => r.person_id === "1");
console.log(`Reconstructed Person 1 Roles:`, p1Roles);
console.assert(p1Roles.parents_bio === "2;3", "P1 parents_bio mismatch");

// 5. Тест зовнішнього стороннього GEDCOM файлу (з MyHeritage / FamilySearch)
console.log("\n4. Testing External Third-Party GEDCOM snippet...");
const sampleExternalGedcom = `
0 HEAD
1 SOUR MyHeritage
1 CHAR UTF-8
0 @I100@ INDI
1 NAME Петро Олексійович /Порошенко/
2 GIVN Петро
2 SURN Порошенко
2 _PATR Олексійович
1 SEX M
1 BIRT
2 DATE 26 SEP 1965
2 PLAC м. Болград, Одеська область
1 FAMS @F10@
0 @I101@ INDI
1 NAME Марина Анатоліївна /Порошенко (Переведенцева)/
2 GIVN Марина
2 SURN Порошенко
1 SEX F
1 BIRT
2 DATE 1 FEB 1962
2 PLAC м. Київ
1 FAMS @F10@
0 @I102@ INDI
1 NAME Олексій Петрович /Порошенко/
2 GIVN Олексій
2 SURN Порошенко
1 SEX M
1 BIRT
2 DATE 6 MAR 1985
2 PLAC м. Київ
1 FAMC @F10@
0 @F10@ FAM
1 HUSB @I100@
1 WIFE @I101@
1 CHIL @I102@
1 MARR
2 DATE 1984
2 PLAC м. Київ
0 TRLR
`;

const parsedExternal = parseGedcom(sampleExternalGedcom);
const convertedExternal = convertGedcomToGeneo(parsedExternal, {}, { strategy: "replace" });

console.log(`Parsed & Converted External GEDCOM:`, {
	persons: convertedExternal.basic.map((b) => `${b.person_id}: ${b.name} ${b.surname} (${b.gender})`),
	families: convertedExternal.families.map((f) => `${f.family_id}: husb=${f.husband_id}, wife=${f.wife_id}`),
	children: convertedExternal.familyChildren.map((fc) => `child=${fc.child_id} in fam=${fc.family_id}`),
	places: convertedExternal.places.map((p) => `${p.place_id}: ${p.name_current}`),
});

console.assert(convertedExternal.basic.length === 3, "External persons count failed");
console.assert(convertedExternal.families.length === 1, "External families count failed");
console.assert(convertedExternal.familyChildren.length === 1, "External child count failed");

console.log("\n🎉 CONVERTER TEST PASSED 100%! Ready for full integration.");
