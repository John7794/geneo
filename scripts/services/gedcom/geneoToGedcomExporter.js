// ./scripts/services/gedcom/geneoToGedcomExporter.js

import { formatToGedcomDate } from "./gedcomDateParser.js";
import { formatToGedcomNameLines } from "./nameParser.js";

/**
 * Експортер бази даних Geneo у стандартний файл GEDCOM 5.5.1.
 * 
 * @param {Object} db - Об'єкт бази даних Geneo (з масивами basic, names, birth, death, marriage, families, familyChildren, places, records)
 * @param {Object} options - Налаштування експорту (назва проєкту, версія)
 * @returns {string} - Валідний текстовий вміст файлу .ged у кодуванні UTF-8
 */
export function exportGeneoToGedcom(db = {}, options = {}) {
	const lines = [];

	const basic = db.basic || [];
	const names = db.names || [];
	const birth = db.birth || [];
	const death = db.death || [];
	const baptism = db.baptism || [];
	const funeral = db.funeral || [];
	const marriage = db.marriage || [];
	const families = db.families || [];
	const familyChildren = db.familyChildren || [];
	const places = db.places || [];

	// 1. Індексація допоміжних таблиць за person_id
	const namesMap = new Map();
	names.forEach((r) => namesMap.set(String(r.person_id).trim(), r));

	const birthMap = new Map();
	birth.forEach((r) => birthMap.set(String(r.person_id).trim(), r));

	const deathMap = new Map();
	death.forEach((r) => deathMap.set(String(r.person_id).trim(), r));

	const baptismMap = new Map();
	baptism.forEach((r) => baptismMap.set(String(r.person_id).trim(), r));

	const funeralMap = new Map();
	funeral.forEach((r) => funeralMap.set(String(r.person_id).trim(), r));

	const placesMap = new Map();
	places.forEach((p) => placesMap.set(String(p.place_id).trim(), p.name_current || p.place_name || p.place_id));

	const marriageMap = new Map();
	marriage.forEach((m) => {
		const mId = String(m.marriage_id || "").trim();
		if (mId) marriageMap.set(mId, m);
	});

	// Індексація сімей для кожної особи
	// personFams: personId -> Set<famId> (де особа є одним з подружжя)
	const personFams = new Map();
	// personFamc: childId -> Array<{ famId, pedigreeType }>
	const personFamc = new Map();

	for (const f of families) {
		const famId = String(f.family_id).trim();
		const hId = String(f.husband_id || "").trim();
		const wId = String(f.wife_id || "").trim();

		if (hId) {
			if (!personFams.has(hId)) personFams.set(hId, new Set());
			personFams.get(hId).add(famId);
		}
		if (wId) {
			if (!personFams.has(wId)) personFams.set(wId, new Set());
			personFams.get(wId).add(famId);
		}
	}

	for (const fc of familyChildren) {
		const famId = String(fc.family_id).trim();
		const childId = String(fc.child_id).trim();
		const pType = String(fc.pedigree_type || "birth").trim();

		if (childId) {
			if (!personFamc.has(childId)) personFamc.set(childId, []);
			personFamc.get(childId).push({ famId, pedigreeType: pType });
		}
	}

	// 2. Генерація заголовка (HEAD)
	const now = new Date();
	const gedcomDateStr = `${now.getDate()} ${["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][now.getMonth()]} ${now.getFullYear()}`;

	lines.push("0 HEAD");
	lines.push("1 SOUR Geneo");
	lines.push("2 NAME Geneo Genealogy Platform");
	lines.push("2 VERS 1.0.0");
	lines.push("1 DEST ANY");
	lines.push(`1 DATE ${gedcomDateStr}`);
	lines.push("1 GEDC");
	lines.push("2 VERS 5.5.1");
	lines.push("2 FORM LINEAGE-LINKED");
	lines.push("1 CHAR UTF-8");
	lines.push("1 LANG Ukrainian");

	// 3. Генерація записів осіб (INDI)
	for (const p of basic) {
		const pid = String(p.person_id || p.id).trim();
		if (!pid) continue;

		lines.push(`0 @I${pid}@ INDI`);

		// Ім'я та прізвище
		const nameRow = namesMap.get(pid);
		const nameLines = formatToGedcomNameLines({
			name: p.name,
			surname: p.surname,
			patronymic: p.patronymic,
			nobleNickname: nameRow?.noble_nicknames || "",
		});
		nameLines.forEach((nl) => lines.push(nl));

		// Стать
		const g = String(p.gender || "").trim().toLowerCase();
		const sex = (g === "m" || g === "male" || g === "ч") ? "M" : (g === "f" || g === "female" || g === "ж") ? "F" : "U";
		lines.push(`1 SEX ${sex}`);

		// Народження (BIRT)
		const b = birthMap.get(pid);
		if (b && (b.b_year || b.b_month || b.b_day || b.place_id)) {
			lines.push("1 BIRT");
			const dStr = formatToGedcomDate({
				day: b.b_day,
				month: b.b_month,
				year: b.b_year,
				isOldStyle: String(b.is_old_style) === "1" || String(b.is_old_style).toLowerCase() === "true",
			});
			if (dStr) lines.push(`2 DATE ${dStr}`);
			if (b.place_id && placesMap.has(String(b.place_id).trim())) {
				lines.push(`2 PLAC ${placesMap.get(String(b.place_id).trim())}`);
			}
		}

		// Хрещення (BAPM)
		const bp = baptismMap.get(pid);
		if (bp && (bp.c_year || bp.c_month || bp.c_day || bp.place_id)) {
			lines.push("1 BAPM");
			const dStr = formatToGedcomDate({
				day: bp.c_day,
				month: bp.c_month,
				year: bp.c_year,
				isOldStyle: String(bp.is_old_style) === "1" || String(bp.is_old_style).toLowerCase() === "true",
			});
			if (dStr) lines.push(`2 DATE ${dStr}`);
			if (bp.place_id && placesMap.has(String(bp.place_id).trim())) {
				lines.push(`2 PLAC ${placesMap.get(String(bp.place_id).trim())}`);
			}
		}

		// Смерть (DEAT)
		const d = deathMap.get(pid);
		if (d && (d.d_year || d.d_month || d.d_day || d.place_id || d.d_cause)) {
			lines.push("1 DEAT");
			const dStr = formatToGedcomDate({
				day: d.d_day,
				month: d.d_month,
				year: d.d_year,
				isOldStyle: String(d.is_old_style) === "1" || String(d.is_old_style).toLowerCase() === "true",
			});
			if (dStr) lines.push(`2 DATE ${dStr}`);
			if (d.place_id && placesMap.has(String(d.place_id).trim())) {
				lines.push(`2 PLAC ${placesMap.get(String(d.place_id).trim())}`);
			}
			if (d.d_cause) {
				lines.push(`2 CAUS ${String(d.d_cause).trim()}`);
			}
		}

		// Поховання (BURI)
		const f = funeralMap.get(pid);
		if (f && (f.f_year || f.f_month || f.f_day || f.place_id)) {
			lines.push("1 BURI");
			const dStr = formatToGedcomDate({
				day: f.f_day,
				month: f.f_month,
				year: f.f_year,
				isOldStyle: String(f.is_old_style) === "1" || String(f.is_old_style).toLowerCase() === "true",
			});
			if (dStr) lines.push(`2 DATE ${dStr}`);
			if (f.place_id && placesMap.has(String(f.place_id).trim())) {
				lines.push(`2 PLAC ${placesMap.get(String(f.place_id).trim())}`);
			}
		}

		// Сім'ї, де особа є дитиною (FAMC)
		const famcList = personFamc.get(pid) || [];
		for (const fc of famcList) {
			lines.push(`1 FAMC @${fc.famId}@`);
			if (fc.pedigreeType && fc.pedigreeType !== "birth") {
				lines.push(`2 PEDI ${fc.pedigreeType}`);
			}
		}

		// Сім'ї, де особа є подружжям (FAMS)
		const famsSet = personFams.get(pid) || new Set();
		for (const famId of famsSet) {
			lines.push(`1 FAMS @${famId}@`);
		}
	}

	// 4. Генерація записів сімей (FAM)
	// Групуємо дітей за сім'ями
	const famChildrenMap = new Map();
	for (const fc of familyChildren) {
		const fId = String(fc.family_id).trim();
		if (!famChildrenMap.has(fId)) famChildrenMap.set(fId, []);
		famChildrenMap.get(fId).push(fc);
	}

	for (const f of families) {
		const famId = String(f.family_id).trim();
		if (!famId) continue;

		lines.push(`0 @${famId}@ FAM`);

		const hId = String(f.husband_id || "").trim();
		const wId = String(f.wife_id || "").trim();
		if (hId) lines.push(`1 HUSB @I${hId}@`);
		if (wId) lines.push(`1 WIFE @I${wId}@`);

		// Діти цієї сім'ї
		const chList = famChildrenMap.get(famId) || [];
		for (const ch of chList) {
			const cId = String(ch.child_id).trim();
			if (cId) lines.push(`1 CHIL @I${cId}@`);
		}

		// Шлюб (MARR)
		const mId = String(f.marriage_id || "").trim();
		const m = mId ? marriageMap.get(mId) : null;
		if (m) {
			lines.push("1 MARR");
			const dStr = formatToGedcomDate({
				day: m.m_day,
				month: m.m_month,
				year: m.m_year,
				isOldStyle: String(m.is_old_style) === "1" || String(m.is_old_style).toLowerCase() === "true",
			});
			if (dStr) lines.push(`2 DATE ${dStr}`);
			if (m.place_id && placesMap.has(String(m.place_id).trim())) {
				lines.push(`2 PLAC ${placesMap.get(String(m.place_id).trim())}`);
			}
		}
	}

	// 5. Завершення файлу (TRLR)
	lines.push("0 TRLR");

	return lines.join("\n") + "\n";
}
