// ./scripts/api-tasks/generate-kinship.js
import fs from "fs";
import path from "path";
import Papa from "papaparse";

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

export async function main() {
	console.log("🧬 Starting kinship calculation and tree index precompilation...");

	const rootDir = process.cwd();
	const basicPath = path.join(rootDir, "data", "db", "uk", "basic.csv");
	const rolesPath = path.join(rootDir, "data", "db", "uk", "familyRoles.csv");
	const outputPath = path.join(rootDir, "data", "kinshipIndex.json");

	try {
		const basicRows = parseCSV(basicPath);
		const rolesRows = parseCSV(rolesPath);

		console.log(`[Parser] Loaded ${basicRows.length} basic profiles and ${rolesRows.length} roles rows.`);

		// 1. Побудова карти користувачів
		const peopleMap = new Map();
		for (const row of basicRows) {
			const id = String(row.person_id || row.id || "").trim();
			if (id) {
				peopleMap.set(id, {
					id,
					gender: String(row.gender || "").trim().toLowerCase(),
				});
			}
		}

		// 2. Побудова карти ролей у сім'ї
		const rolesMap = new Map();
		for (const row of rolesRows) {
			const id = String(row.person_id || "").trim();
			if (id) {
				rolesMap.set(id, {
					parents_bio: parseCSVList(row.parents_bio),
					parents_step: parseCSVList(row.parents_step),
					parents_adopted: parseCSVList(row.parents_adopted),
					spouses: parseCSVList(row.spouses),
				});
			}
		}

		// Помічник для розпізнавання батьків за біологічним зв'язком та статтю
		function getBioParents(personId) {
			const role = rolesMap.get(personId);
			if (!role) return { father: null, mother: null, list: [] };
			const list = role.parents_bio || [];
			let father = null;
			let mother = null;
			for (const parentId of list) {
				const parent = peopleMap.get(parentId);
				if (parent) {
					const g = parent.gender;
					if (g === "m" || g === "male" || g === "ч") {
						father = parentId;
					} else if (g === "f" || g === "female" || g === "ж") {
						mother = parentId;
					}
				}
			}
			return { father, mother, list };
		}

		// Побудова списку дітей по біологічних лініях
		const childrenMap = new Map();
		for (const [pid, role] of rolesMap.entries()) {
			const bioParents = role.parents_bio || [];
			for (const parentId of bioParents) {
				if (!childrenMap.has(parentId)) {
					childrenMap.set(parentId, []);
				}
				childrenMap.get(parentId).push(pid);
			}
		}

		// Домоміжний рекурсивний трасувальник предків
		function getAncestors(personId, visited = new Set()) {
			const { list } = getBioParents(personId);
			const ans = [];
			for (const pid of list) {
				if (!visited.has(pid)) {
					visited.add(pid);
					ans.push(pid);
					ans.push(...getAncestors(pid, visited));
				}
			}
			return ans;
		}

		// Помічник для мапування предків з розрахунком кроків/поколінь
		function mapAncestors(personId, stepsMap, depth = 1) {
			if (depth > 8) return;
			const { list } = getBioParents(personId);
			for (const parentId of list) {
				if (!stepsMap.has(parentId) || stepsMap.get(parentId) > depth) {
					stepsMap.set(parentId, depth);
					mapAncestors(parentId, stepsMap, depth + 1);
				}
			}
		}

		const kinshipIndex = {};

		// 3. Обчислення індексу спорідненості для кожної людини в дереві
		for (const [id, person] of peopleMap.entries()) {
			const myRole = rolesMap.get(id);

			// --- Батьки ---
			const bio = myRole ? (myRole.parents_bio || []).join(" ") : "";
			const stMale = [];
			const stFemale = [];
			if (myRole?.parents_step) {
				for (const stepId of myRole.parents_step) {
					const stepP = peopleMap.get(stepId);
					if (stepP) {
						if (stepP.gender === "m" || stepP.gender === "male" || stepP.gender === "ч") {
							stMale.push(stepId);
						} else {
							stFemale.push(stepId);
						}
					}
				}
			}
			const ad = myRole ? (myRole.parents_adopted || []).join(" ") : "";

			const pObj = {
				bio,
				st: { f: stMale.join(" "), m: stFemale.join(" ") },
				ad,
			};

			// --- Дідусі й бабусі ---
			const gpObj = { f: "", m: "" };
			const { father: dadId, mother: momId } = getBioParents(id);
			if (dadId) {
				const fParents = getBioParents(dadId).list;
				if (fParents.length > 0) gpObj.f = fParents.join(" ");
			}
			if (momId) {
				const mParents = getBioParents(momId).list;
				if (mParents.length > 0) gpObj.m = mParents.join(" ");
			}

			// --- Брати й сестри ---
			const sbObj = { full: "", half_p: "", half_m: "", step: "" };
			const myBioParents = myRole?.parents_bio || [];
			if (myBioParents.length > 0) {
				const full = [];
				const half_p = [];
				const half_m = [];
				for (const otherId of peopleMap.keys()) {
					if (otherId === id) continue;
					const otherRole = rolesMap.get(otherId);
					const otherParents = otherRole?.parents_bio || [];
					if (otherParents.length > 0) {
						const intersection = myBioParents.filter((pid) => otherParents.includes(pid));
						if (intersection.length >= 2) {
							full.push(otherId);
						} else if (intersection.length === 1) {
							const sharedParentId = intersection[0];
							const sharedP = peopleMap.get(sharedParentId);
							if (sharedP) {
								const g = sharedP.gender;
								if (g === "m" || g === "male" || g === "ч") {
									half_p.push(otherId);
								} else {
									half_m.push(otherId);
								}
							}
						}
					}
				}
				if (full.length > 0) sbObj.full = full.join(" ");
				if (half_p.length > 0) sbObj.half_p = half_p.join(" ");
				if (half_m.length > 0) sbObj.half_m = half_m.join(" ");
			}

			// --- Шлюбні союзи ---
			const mySpouses = myRole?.spouses || [];
			const m_map = [];
			for (const spouseId of mySpouses) {
				const jointChildren = [];
				for (const childId of childrenMap.get(id) || []) {
					const childParents = rolesMap.get(childId)?.parents_bio || [];
					if (childParents.includes(spouseId)) {
						jointChildren.push(childId);
					}
				}
				m_map.push({
					spouseId,
					children: {
						bio: jointChildren.join(" "),
						st: { f: "", m: "" },
						ad: "",
					},
				});
			}

			// --- Онуки ---
			const gc_map = {};
			const myChildren = childrenMap.get(id) || [];
			for (const childId of myChildren) {
				const gcList = childrenMap.get(childId) || [];
				if (gcList.length > 0) {
					gc_map[childId] = gcList.join(" ");
				}
			}

			// --- Усі спільні предки (Ancestors) ---
			const uniqueAncestors = Array.from(new Set(getAncestors(id)));
			const ancStr = uniqueAncestors.join(" ");

			// --- Ступені спорідненості (Cousins 3 до 7 ступеня) ---
			const paternalAncestors = new Map();
			const maternalAncestors = new Map();
			if (dadId) {
				paternalAncestors.set(dadId, 0);
				mapAncestors(dadId, paternalAncestors, 1);
			}
			if (momId) {
				maternalAncestors.set(momId, 0);
				mapAncestors(momId, maternalAncestors, 1);
			}

			const cousinLevels = {}; // level -> { pat: Set, mat: Set }

			for (const otherId of peopleMap.keys()) {
				if (otherId === id) continue;

				// Швидка генерація карти предків для іншої людини
				const otherAncestors = new Map();
				const { father: otherDad, mother: otherMom } = getBioParents(otherId);
				if (otherDad) {
					otherAncestors.set(otherDad, 1);
					mapAncestors(otherDad, otherAncestors, 2);
				}
				if (otherMom) {
					otherAncestors.set(otherMom, 1);
					mapAncestors(otherMom, otherAncestors, 2);
				}

				let bestPatLevel = 99;
				let bestMatLevel = 99;

				// Перевіряємо батьківську гілку спорідненості
				for (const [ancId, mySteps] of paternalAncestors.entries()) {
					if (otherAncestors.has(ancId)) {
						const otherSteps = otherAncestors.get(ancId);
						if (mySteps + 1 === otherSteps) {
							const level = mySteps + 2;
							if (level < bestPatLevel) bestPatLevel = level;
						}
					}
				}

				// Перевіряємо материнську гілку спорідненості
				for (const [ancId, mySteps] of maternalAncestors.entries()) {
					if (otherAncestors.has(ancId)) {
						const otherSteps = otherAncestors.get(ancId);
						if (mySteps + 1 === otherSteps) {
							const level = mySteps + 2;
							if (level < bestMatLevel) bestMatLevel = level;
						}
					}
				}

				// Якщо знайшли спорідненость у межах 3-7 колін
				if (bestPatLevel >= 3 && bestPatLevel <= 7) {
					if (!cousinLevels[bestPatLevel]) {
						cousinLevels[bestPatLevel] = { pat: new Set(), mat: new Set() };
					}
					cousinLevels[bestPatLevel].pat.add(otherId);
				}
				if (bestMatLevel >= 3 && bestMatLevel <= 7) {
					if (!cousinLevels[bestMatLevel]) {
						cousinLevels[bestMatLevel] = { pat: new Set(), mat: new Set() };
					}
					cousinLevels[bestMatLevel].mat.add(otherId);
				}
			}

			// Форматуємо масив знайдених кузенів за уровнями
			const relList = [];
			for (let lvl = 3; lvl <= 7; lvl++) {
				if (cousinLevels[lvl]) {
					const patArr = Array.from(cousinLevels[lvl].pat);
					const matArr = Array.from(cousinLevels[lvl].mat);
					if (patArr.length > 0 || matArr.length > 0) {
						relList.push({
							level: lvl,
							pat: patArr.join(" "),
							mat: matArr.join(" "),
						});
					}
				}
			}

			// Зберігаємо структуру об'єкта у вихідний пул
			kinshipIndex[id] = {
				gp: gpObj,
				p: pObj,
				sb: sbObj,
				m_map,
				gc_map,
				anc: ancStr,
			};

			if (relList.length > 0) {
				kinshipIndex[id].rel = relList;
			}
		}

		console.log(`[Tree Engine] Precomputed index for ${Object.keys(kinshipIndex).length} profiles.`);

		// Записуємо готовий стислий JSON-індекс на диск
		fs.writeFileSync(outputPath, JSON.stringify(kinshipIndex), "utf8");
		console.log(`✅ Kinship index successfully compiled and written to: ${outputPath}`);
	} catch (error) {
		console.error("❌ Kinship compilation failed:", error);
		throw error;
	}
}

if (typeof process !== "undefined" && process.argv && process.argv[1] && process.argv[1].includes("generate-kinship.js")) {
	main();
}
