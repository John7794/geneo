// ./scripts/api-tasks/migrate-to-families.js
import fs from "fs";
import path from "path";
import Papa from "papaparse";

export function getActiveDataDir() {
	if (process.env.ACTIVE_DATA_DIR) {
		return process.env.ACTIVE_DATA_DIR;
	}
	return path.join(process.cwd(), "data");
}

function parseCSV(filePath) {
	if (!fs.existsSync(filePath)) {
		throw new Error(`File not found: ${filePath}`);
	}
	const content = fs.readFileSync(filePath, "utf8");
	const parsed = Papa.parse(content, {
		header: true,
		skipEmptyLines: true,
		dynamicTyping: false,
	});
	return parsed.data;
}

function parseCSVList(str) {
	if (!str) return [];
	return String(str)
		.split(/[;,\s]+/)
		.map((s) => s.trim())
		.filter(Boolean);
}

function cleanId(val) {
	if (val === undefined || val === null) return "";
	const s = String(val).trim();
	if (s.toLowerCase() === "n" || s === "-") return "";
	return s;
}

export function migrateToFamilies() {
	console.log("🚀 Starting GEDCOM normalization: migrating to families & familyChildren...");
	const dataDir = getActiveDataDir();
	const ukDir = path.join(dataDir, "db", "uk");

	const basicPath = path.join(ukDir, "basic.csv");
	const marriagePath = path.join(ukDir, "marriage.csv");
	const rolesPath = path.join(ukDir, "familyRoles.csv");
	const birthPath = path.join(ukDir, "birth.csv");

	const basicRows = parseCSV(basicPath);
	const marriageRows = fs.existsSync(marriagePath) ? parseCSV(marriagePath) : [];
	const rolesRows = fs.existsSync(rolesPath) ? parseCSV(rolesPath) : [];
	const birthRows = fs.existsSync(birthPath) ? parseCSV(birthPath) : [];

	console.log(`[Input] basic: ${basicRows.length}, marriage: ${marriageRows.length}, familyRoles: ${rolesRows.length}, birth: ${birthRows.length}`);

	// 1. Словник осіб та їх статі
	const peopleMap = new Map();
	for (const row of basicRows) {
		const id = cleanId(row.person_id || row.id);
		if (id) {
			const g = String(row.gender || "").trim().toLowerCase();
			peopleMap.set(id, {
				id,
				gender: (g === "m" || g === "male" || g === "ч") ? "M" : (g === "f" || g === "female" || g === "ж") ? "F" : "U",
				birthSort: "",
			});
		}
	}

	// Додаємо дати народження для правильного сортування дітей в сім'ї
	for (const row of birthRows) {
		const id = cleanId(row.person_id);
		if (id && peopleMap.has(id)) {
			const person = peopleMap.get(id);
			const year = String(row.b_year || "").padStart(4, "0");
			const month = String(row.b_month || "00").padStart(2, "0");
			const day = String(row.b_day || "00").padStart(2, "0");
			person.birthSort = row.date_sort || (year !== "0000" ? `${year}-${month}-${day}` : "");
		}
	}

	// 2. Структури сімей
	// familiesKeyMap: Map<"id1_id2", familyRecord>
	const familiesKeyMap = new Map();
	// familyList: Array of familyRecord
	const families = [];

	function getSpouseKey(id1, id2) {
		const s1 = cleanId(id1);
		const s2 = cleanId(id2);
		if (!s1 && !s2) return "";
		if (!s1) return `_U_${s2}`;
		if (!s2) return `_U_${s1}`;
		return [s1, s2].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).join("_");
	}

	function determineHusbandWife(p1Id, p2Id) {
		const p1 = peopleMap.get(p1Id);
		const p2 = peopleMap.get(p2Id);
		const g1 = p1?.gender || "U";
		const g2 = p2?.gender || "U";

		if (g1 === "M" && g2 === "F") return { husbandId: p1Id, wifeId: p2Id };
		if (g1 === "F" && g2 === "M") return { husbandId: p2Id, wifeId: p1Id };
		if (g1 === "M") return { husbandId: p1Id, wifeId: p2Id };
		if (g2 === "M") return { husbandId: p2Id, wifeId: p1Id };
		if (g1 === "F") return { husbandId: "", wifeId: p1Id };
		if (g2 === "F") return { husbandId: "", wifeId: p2Id };
		// Обидва невизначені - зберігаємо за алфавітом/числом
		const sorted = [p1Id, p2Id].filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
		return { husbandId: sorted[0] || "", wifeId: sorted[1] || "" };
	}

	let famCounter = 1;

	function getOrCreateFamily(p1Id, p2Id, meta = {}) {
		const key = getSpouseKey(p1Id, p2Id);
		if (!key) return null;

		if (familiesKeyMap.has(key)) {
			const existing = familiesKeyMap.get(key);
			// Оновлюємо метадані, якщо вони повніші
			if (!existing.marriage_id && meta.marriage_id) existing.marriage_id = meta.marriage_id;
			if (!existing.union_status && meta.union_status) existing.union_status = meta.union_status;
			if (!existing.m_number && meta.m_number) existing.m_number = meta.m_number;
			return existing;
		}

		const { husbandId, wifeId } = determineHusbandWife(p1Id, p2Id);
		const familyId = `FAM_${husbandId || "X"}_${wifeId || "X"}`;

		const newFamily = {
			family_id: familyId,
			husband_id: husbandId,
			wife_id: wifeId,
			marriage_id: meta.marriage_id || "",
			union_status: meta.union_status || "official",
			m_number: meta.m_number || "1",
			source: meta.source || "inferred",
			children: [], // тимчасовий масив для збору дітей
		};

		familiesKeyMap.set(key, newFamily);
		families.push(newFamily);
		return newFamily;
	}

	// А. Обробка шлюбів з marriage.csv
	let marriageProcessed = 0;
	for (const row of marriageRows) {
		const p1 = cleanId(row.person_id);
		const p2 = cleanId(row.spouse_id);
		if (!p1 || !p2) continue;

		getOrCreateFamily(p1, p2, {
			marriage_id: cleanId(row.marriage_id),
			union_status: cleanId(row.union_status) || "official",
			m_number: cleanId(row.m_number) || "1",
			source: "marriage",
		});
		marriageProcessed++;
	}
	console.log(`[Families] Processed ${marriageProcessed} marriage records -> ${families.length} unique families formed.`);

	// Б. Обробка ролей та батьків з familyRoles.csv
	// familyChildrenRows: Array of { family_id, child_id, pedigree_type, order }
	const familyChildren = [];
	const childFamilyLinksSet = new Set(); // key: `${familyId}_${childId}_${pedigreeType}`

	function addChildLink(family, childId, pedigreeType = "birth") {
		if (!family || !childId) return;
		const linkKey = `${family.family_id}_${childId}_${pedigreeType}`;
		if (childFamilyLinksSet.has(linkKey)) return;

		childFamilyLinksSet.add(linkKey);
		family.children.push({ childId, pedigreeType });
	}

	for (const row of rolesRows) {
		const childId = cleanId(row.person_id);
		if (!childId) continue;

		// 1. Біологічні батьки
		const bioParents = parseCSVList(row.parents_bio).map(cleanId).filter(Boolean);
		if (bioParents.length === 2) {
			const fam = getOrCreateFamily(bioParents[0], bioParents[1], { source: "parents_bio" });
			addChildLink(fam, childId, "birth");
		} else if (bioParents.length === 1) {
			// Одинарний батько/мати
			const p = peopleMap.get(bioParents[0]);
			const p1 = (p?.gender === "F") ? "" : bioParents[0];
			const p2 = (p?.gender === "F") ? bioParents[0] : "";
			const fam = getOrCreateFamily(p1, p2, { source: "single_parent" });
			addChildLink(fam, childId, "birth");
		}

		// 2. Усиновлені діти
		const adoptedParents = parseCSVList(row.parents_adopted).map(cleanId).filter(Boolean);
		if (adoptedParents.length === 2) {
			const fam = getOrCreateFamily(adoptedParents[0], adoptedParents[1], { source: "parents_adopted" });
			addChildLink(fam, childId, "adopted");
		} else if (adoptedParents.length === 1) {
			const fam = getOrCreateFamily(adoptedParents[0], "", { source: "single_adopted" });
			addChildLink(fam, childId, "adopted");
		}

		// 3. Вітчим / мачуха (step)
		const stepParents = parseCSVList(row.parents_step).map(cleanId).filter(Boolean);
		for (const spId of stepParents) {
			// Зв'язуємо з сім'єю вітчима/мачухи, якщо така є
			const fam = getOrCreateFamily(spId, "", { source: "step_parent" });
			addChildLink(fam, childId, "step");
		}

		// 4. Подружжя з familyRoles (якщо не було в marriage.csv)
		const spouses = parseCSVList(row.spouses).map(cleanId).filter(Boolean);
		for (const spId of spouses) {
			getOrCreateFamily(childId, spId, { source: "familyRoles_spouses" });
		}
	}

	// 3. Формування таблиці familyChildren з правильним сортуванням за віком дітей
	for (const fam of families) {
		// Сортуємо дітей за датою народження
		fam.children.sort((a, b) => {
			const pA = peopleMap.get(a.childId);
			const pB = peopleMap.get(b.childId);
			const sortA = pA?.birthSort || "";
			const sortB = pB?.birthSort || "";
			if (sortA && sortB) return sortA.localeCompare(sortB);
			if (sortA) return -1;
			if (sortB) return 1;
			return a.childId.localeCompare(b.childId, undefined, { numeric: true });
		});

		fam.children.forEach((c, idx) => {
			familyChildren.push({
				family_id: fam.family_id,
				child_id: c.childId,
				pedigree_type: c.pedigreeType,
				order: String(idx + 1),
			});
		});
	}

	console.log(`[Results] Total families: ${families.length}`);
	console.log(`[Results] Total child links: ${familyChildren.length}`);

	// 4. Перевірка 100% цілісності (Verification)
	let matched = 0;
	let missing = 0;
	for (const row of rolesRows) {
		const childId = cleanId(row.person_id);
		const bioParents = parseCSVList(row.parents_bio).map(cleanId).filter(Boolean);
		if (bioParents.length > 0) {
			// Знаходимо сім'ї цієї дитини
			const links = familyChildren.filter((fc) => fc.child_id === childId && fc.pedigree_type === "birth");
			const foundParentIds = new Set();
			links.forEach((l) => {
				const fam = families.find((f) => f.family_id === l.family_id);
				if (fam) {
					if (fam.husband_id) foundParentIds.add(fam.husband_id);
					if (fam.wife_id) foundParentIds.add(fam.wife_id);
				}
			});

			const allParentsPresent = bioParents.every((bp) => foundParentIds.has(bp));
			if (allParentsPresent) {
				matched++;
			} else {
				missing++;
				console.warn(`[Integrity Mismatch] Child ${childId} expected bioParents ${bioParents.join(",")} but found ${Array.from(foundParentIds).join(",")}`);
			}
		}
	}
	console.log(`[Verification] 100% Check: Matched ${matched} profiles with parents, Missing: ${missing}`);

	// 5. Запис у CSV файли
	const familiesCSVRows = families.map((f) => ({
		family_id: f.family_id,
		husband_id: f.husband_id,
		wife_id: f.wife_id,
		marriage_id: f.marriage_id,
		union_status: f.union_status,
		m_number: f.m_number,
		source: f.source,
	}));

	const familiesCSV = Papa.unparse(familiesCSVRows, { header: true });
	const familyChildrenCSV = Papa.unparse(familyChildren, { header: true });

	const familiesOutPath = path.join(ukDir, "families.csv");
	const familyChildrenOutPath = path.join(ukDir, "familyChildren.csv");

	fs.writeFileSync(familiesOutPath, familiesCSV, "utf8");
	fs.writeFileSync(familyChildrenOutPath, familyChildrenCSV, "utf8");

	console.log(`✅ Saved ${familiesOutPath} (${familiesCSVRows.length} rows)`);
	console.log(`✅ Saved ${familyChildrenOutPath} (${familyChildren.length} rows)`);

	return {
		familiesCount: families.length,
		childrenCount: familyChildren.length,
		matched,
		missing,
	};
}

if (process.argv[1] && process.argv[1].endsWith("migrate-to-families.js")) {
	migrateToFamilies();
}
