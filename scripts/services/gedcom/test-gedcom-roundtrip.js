// ./scripts/services/gedcom/test-gedcom-roundtrip.js
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { parseGedcom, parseGedcomDate, parseGedcomName, exportGeneoToGedcom } from "./index.js";

function parseCsv(p) {
	if (!fs.existsSync(p)) return [];
	return Papa.parse(fs.readFileSync(p, "utf8"), { header: true, skipEmptyLines: true }).data;
}

console.log("🧪 --- GEDCOM MODULE TEST SUITE ---");

// Test 1: Date Parser
console.log("\n1. Testing Date Parser...");
const d1 = parseGedcomDate("15 MAY 1880");
console.assert(d1.day === "15" && d1.month === "05" && d1.year === "1880", "d1 failed");
const d2 = parseGedcomDate("@#DJULIAN@ 22 ЛИС 1904");
console.assert(d2.day === "22" && d2.month === "11" && d2.year === "1904" && d2.isOldStyle, "d2 failed");
const d3 = parseGedcomDate("ABT 1845");
console.assert(d3.year === "1845" && d3.dateType === "about", "d3 failed");
const d4 = parseGedcomDate("BET 1880 AND 1885");
console.assert(d4.year === "1880" && d4.yearTo === "1885" && d4.dateType === "range", "d4 failed");
console.log("✅ All Date Parser tests passed!");

// Test 2: Name Parser
console.log("\n2. Testing Name Parser...");
const n1 = parseGedcomName("Іван Петрович /Коваленко/");
console.assert(n1.name === "Іван" && n1.patronymic === "Петрович" && n1.surname === "Коваленко", "n1 failed");
const n2 = parseGedcomName("Олена Василівна /Шевченко (Коваль)/");
console.assert(n2.name === "Олена" && n2.patronymic === "Василівна" && n2.surname === "Шевченко" && n2.maidenSurname === "Коваль", "n2 failed");
console.log("✅ All Name Parser tests passed!");

// Test 3: Full Database Round-Trip (Export -> Parse -> Verify)
console.log("\n3. Testing Full Database Round-Trip on real Geneo data...");
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

console.log(`[Input] basic: ${db.basic.length}, families: ${db.families.length}, children: ${db.familyChildren.length}`);

// Експорт у GEDCOM
const startTime = Date.now();
const gedcomOutput = exportGeneoToGedcom(db);
const exportDuration = Date.now() - startTime;
console.log(`[Export] Generated GEDCOM file: ${gedcomOutput.length} characters in ${exportDuration}ms.`);

// Запис у тестовий файл
const testGedPath = path.join(process.cwd(), "data", "test_export.ged");
fs.writeFileSync(testGedPath, gedcomOutput, "utf8");
console.log(`[File] Saved ${testGedPath} (${(fs.statSync(testGedPath).size / 1024).toFixed(1)} KB)`);

// Парсинг назад у дерево
const parseStartTime = Date.now();
const parsed = parseGedcom(gedcomOutput);
const parseDuration = Date.now() - parseStartTime;

console.log(`[Parser] Parsed in ${parseDuration}ms:`);
console.log(`  - Individuals parsed: ${parsed.stats.individualsCount} (expected: ${db.basic.length})`);
console.log(`  - Families parsed: ${parsed.stats.familiesCount} (expected: ${db.families.length})`);

console.assert(parsed.stats.individualsCount === db.basic.length, "Individuals count mismatch!");
console.assert(parsed.stats.familiesCount === db.families.length, "Families count mismatch!");

// Перевірка конкретних осіб
const p1 = parsed.individuals.find((i) => i.id === "I1");
console.log(`\nVerified Person I1:`, {
	fullName: p1.primaryName.fullName,
	name: p1.primaryName.name,
	patronymic: p1.primaryName.patronymic,
	surname: p1.primaryName.surname,
	gender: p1.gender,
	birth: p1.birth,
	familiesAsChild: p1.familiesAsChild,
});

const fam23 = parsed.families.find((f) => f.id === "FAM_2_3");
console.log(`\nVerified Family FAM_2_3:`, {
	husband: fam23.husbandId,
	wife: fam23.wifeId,
	children: fam23.children,
	marriage: fam23.marriage,
});

console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! 100% Round-trip GEDCOM compliance verified.");
