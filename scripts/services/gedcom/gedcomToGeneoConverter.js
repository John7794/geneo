// ./scripts/services/gedcom/gedcomToGeneoConverter.js

import { buildFamilyRolesFromFamilies } from "../familyAdapter.js";

/**
 * Конвертер розпарсеного AST-графа GEDCOM у реляційні таблиці Geneo.
 * Генерує таблиці: basic, names, birth, death, baptism, funeral, marriage,
 * families, familyChildren, familyRoles, places, records, archives.
 */

function cleanId(idStr) {
	if (!idStr) return "";
	return String(idStr).replace(/^@|@$/g, "").trim();
}

/**
 * Нормалізація рядка населеного пункту для порівняння
 */
function normalizePlaceName(str) {
	if (!str) return "";
	return str
		.toLowerCase()
		.replace(/^(м\.|с\.|сел\.|смт\.|город|деревня|село)\s+/i, "")
		.replace(/[,;].*$/, "") // беремо основну назву до першої коми
		.trim();
}

/**
 * Транслітерація для генерації slug та id
 */
function slugify(text) {
	if (!text) return "unknown";
	const ukr = {
		"а": "a", "б": "b", "в": "v", "г": "h", "ґ": "g", "д": "d", "е": "e", "є": "ye",
		"ж": "zh", "з": "z", "и": "y", "і": "i", "ї": "yi", "й": "y", "к": "k", "л": "l",
		"м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
		"ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "shch", "ь": "", "ю": "yu", "я": "ya",
	};
	return text
		.toLowerCase()
		.split("")
		.map((ch) => ukr[ch] || ch)
		.join("")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

/**
 * Головна функція конвертації GEDCOM AST у таблиці Geneo
 * 
 * @param {Object} parsedGedcom - Результат виклику parseGedcom()
 * @param {Object} existingDb - Наявна база даних (для зіставлення places, duplicate detection тощо)
 * @param {Object} options - { strategy: "replace" | "merge" }
 * @returns {Object} - Словник згенерованих таблиць Geneo
 */
export function convertGedcomToGeneo(parsedGedcom, existingDb = {}, options = {}) {
	if (!parsedGedcom || !Array.isArray(parsedGedcom.individuals)) {
		throw new Error("Invalid GEDCOM structure for conversion.");
	}

	const strategy = options.strategy || "replace";
	const isMerge = strategy === "merge";

	// 1. Ініціалізація або копіювання наявних таблиць
	const basic = isMerge ? [...(existingDb.basic || [])] : [];
	const names = isMerge ? [...(existingDb.names || [])] : [];
	const birth = isMerge ? [...(existingDb.birth || [])] : [];
	const death = isMerge ? [...(existingDb.death || [])] : [];
	const baptism = isMerge ? [...(existingDb.baptism || [])] : [];
	const funeral = isMerge ? [...(existingDb.funeral || [])] : [];
	const marriage = isMerge ? [...(existingDb.marriage || [])] : [];
	const families = isMerge ? [...(existingDb.families || [])] : [];
	const familyChildren = isMerge ? [...(existingDb.familyChildren || [])] : [];
	const places = [...(existingDb.places || [])];
	const records = isMerge ? [...(existingDb.records || [])] : [];
	const archives = isMerge ? [...(existingDb.archives || [])] : [];

	// 2. Словник населених пунктів для швидкого пошуку
	const placesNormMap = new Map();
	places.forEach((p) => {
		const name = p.name_current || p.place_name || "";
		if (name) placesNormMap.set(normalizePlaceName(name), String(p.place_id).trim());
		if (p.place_id) placesNormMap.set(normalizePlaceName(String(p.place_id)), String(p.place_id).trim());
	});

	let newPlaceCounter = 1;
	function resolvePlaceId(placeStr) {
		if (!placeStr || typeof placeStr !== "string") return "";
		const trimmed = placeStr.trim();
		if (!trimmed) return "";

		const norm = normalizePlaceName(trimmed);
		if (placesNormMap.has(norm)) {
			return placesNormMap.get(norm);
		}

		// Якщо населений пункт не знайдено — створюємо новий
		const generatedId = `PL_GEN_${slugify(norm).toUpperCase() || newPlaceCounter++}`;
		const newPlaceRow = {
			place_id: generatedId,
			name_current: trimmed,
			status: "",
			geo_lat: "",
			geo_lng: "",
			google_maps_url: "",
			note: "Created via GEDCOM import",
		};

		places.push(newPlaceRow);
		placesNormMap.set(norm, generatedId);
		return generatedId;
	}

	// 3. Мапування ID осіб (GEDCOM ID -> Geneo ID)
	const indiIdMap = new Map();
	const existingPersonIds = new Set(basic.map((b) => String(b.person_id || b.id).trim()));

	let nextNumericId = 1;
	if (existingPersonIds.size > 0) {
		const nums = Array.from(existingPersonIds)
			.map((id) => parseInt(id, 10))
			.filter((n) => !isNaN(n));
		if (nums.length > 0) nextNumericId = Math.max(...nums) + 1;
	}

	for (const indi of parsedGedcom.individuals) {
		const rawId = cleanId(indi.id);
		let targetId = rawId;

		// Спроба використати числовий ID якщо це можливо (наприклад @I1@ -> "1")
		const numMatch = rawId.match(/^I?(\d+)$/i);
		if (numMatch && !isMerge) {
			targetId = numMatch[1];
		} else if (isMerge || existingPersonIds.has(targetId)) {
			targetId = String(nextNumericId++);
		}

		indiIdMap.set(rawId, targetId);
		existingPersonIds.add(targetId);
	}

	// 4. Конвертація осіб (INDI -> basic, names, birth, death, baptism, funeral)
	for (const indi of parsedGedcom.individuals) {
		const rawId = cleanId(indi.id);
		const personId = indiIdMap.get(rawId) || rawId;
		const nameObj = indi.primaryName || {};

		// Визначення vital_status
		let vitalStatus = "1"; // живий за замовчуванням
		if (indi.death && indi.death.year) {
			vitalStatus = "0";
		} else if (indi.birth && indi.birth.year) {
			const bYear = parseInt(indi.birth.year, 10);
			if (!isNaN(bYear) && new Date().getFullYear() - bYear > 105) {
				vitalStatus = "0";
			}
		}

		const slugBase = [nameObj.name, nameObj.patronymic, nameObj.surname].filter(Boolean).join(" ");
		const profileSlug = slugify(slugBase) ? `${slugify(slugBase)}-${personId}` : `person-${personId}`;

		// A. basic.csv
		basic.push({
			person_id: personId,
			surname: nameObj.surname || "",
			name: nameObj.name || "",
			patronymic: nameObj.patronymic || "",
			gender: indi.gender || "U",
			status: "",
			photo_id: "",
			vital_status: vitalStatus,
			profile_slug: profileSlug,
		});

		// B. names.csv
		names.push({
			person_id: personId,
			title: nameObj.prefix || "",
			baptism_name: "",
			service_surname: "",
			b_surname: nameObj.maidenSurname || "",
			b_noble_nicknames: nameObj.nobleNickname || "",
			b_origin_place: "",
			b_coat_of_arms: "",
			de_jure_patronymic: "",
			alt_first_names: "",
			alt_surnames: "",
			m_surname: "",
			m_noble_nicknames: "",
			m_origin_place: "",
			m_coat_of_arms: "",
		});

		// C. birth.csv
		if (indi.birth) {
			const placeId = resolvePlaceId(indi.birth.place);
			birth.push({
				person_id: personId,
				birth_id: `B_${personId}`,
				is_old_style: indi.birth.isOldStyle ? "1" : "",
				record_type: "birth",
				b_time: "",
				b_day: indi.birth.day || "",
				b_month: indi.birth.month || "",
				b_year: indi.birth.year || "",
				b_place_details: "",
				b_place_address: indi.birth.address || "",
				place_id: placeId,
				b_admin_division: "",
				date_sort: indi.birth.dateSort || "",
			});
		}

		// D. death.csv
		if (indi.death) {
			const placeId = resolvePlaceId(indi.death.place);
			death.push({
				person_id: personId,
				death_id: `D_${personId}`,
				is_old_style: indi.death.isOldStyle ? "1" : "",
				d_time: "",
				d_day: indi.death.day || "",
				d_month: indi.death.month || "",
				d_year: indi.death.year || "",
				d_cause: indi.death.cause || "",
				d_age: "",
				d_place_details: "",
				d_place_address: indi.death.address || "",
				place_id: placeId,
				d_admin_division: "",
				date_sort: indi.death.dateSort || "",
			});
		}

		// E. baptism.csv
		if (indi.baptism) {
			const placeId = resolvePlaceId(indi.baptism.place);
			baptism.push({
				baptism_id: `BAP_${personId}`,
				person_id: personId,
				is_old_style: indi.baptism.isOldStyle ? "1" : "",
				c_day: indi.baptism.day || "",
				c_month: indi.baptism.month || "",
				c_year: indi.baptism.year || "",
				date_sort: indi.baptism.dateSort || "",
				church_id: "",
				place_id: placeId,
				c_admin_division: "",
			});
		}

		// F. funeral.csv
		if (indi.funeral) {
			const placeId = resolvePlaceId(indi.funeral.place);
			funeral.push({
				funeral_id: `F_${personId}`,
				person_id: personId,
				linked_death_id: `D_${personId}`,
				is_old_style: indi.funeral.isOldStyle ? "1" : "",
				f_time: "",
				f_day: indi.funeral.day || "",
				f_month: indi.funeral.month || "",
				f_year: indi.funeral.year || "",
				date_sort: indi.funeral.dateSort || "",
				place_id: placeId,
				church_id: "",
				cemetery_id: "",
				f_place_details: "",
				f_admin_division: "",
			});
		}
	}

	// 5. Конвертація сімей (FAM -> families, familyChildren, marriage)
	const famIdMap = new Map();
	const createdFamilyIds = new Set(families.map((f) => String(f.family_id).trim()));

	for (const fam of parsedGedcom.families) {
		const rawFamId = cleanId(fam.id);
		const husbRaw = cleanId(fam.husbandId);
		const wifeRaw = cleanId(fam.wifeId);

		const hId = indiIdMap.get(husbRaw) || husbRaw;
		const wId = indiIdMap.get(wifeRaw) || wifeRaw;

		let targetFamId = `FAM_${hId || "X"}_${wId || "X"}`;
		if (createdFamilyIds.has(targetFamId) || (!hId && !wId)) {
			targetFamId = `FAM_${rawFamId}`;
		}

		famIdMap.set(rawFamId, targetFamId);
		createdFamilyIds.add(targetFamId);

		let marriageId = "";
		if (fam.marriage) {
			marriageId = `M_${hId || "X"}_${wId || "X"}_1`;
			const mPlaceId = resolvePlaceId(fam.marriage.place);

			marriage.push({
				person_id: hId || wId || "",
				spouse_id: wId || hId || "",
				marriage_id: marriageId,
				union_status: fam.divorce ? "divorced" : "official",
				m_number: "1",
				is_old_style: fam.marriage.isOldStyle ? "1" : "",
				m_day: fam.marriage.day || "",
				m_month: fam.marriage.month || "",
				m_year: fam.marriage.year || "",
				church_id: "",
				place_id: mPlaceId,
				m_admin_division: "",
				m_civil_place_details: "",
				m_civil_place_address: "",
				date_sort: fam.marriage.dateSort || "",
			});
		}

		families.push({
			family_id: targetFamId,
			husband_id: hId || "",
			wife_id: wId || "",
			marriage_id: marriageId,
			union_status: fam.divorce ? "divorced" : "official",
			m_number: "1",
			source: "gedcom_import",
		});

		// Діти родини
		if (Array.isArray(fam.children)) {
			fam.children.forEach((c, idx) => {
				const cRaw = cleanId(c.childId);
				const childId = indiIdMap.get(cRaw) || cRaw;
				if (childId) {
					familyChildren.push({
						family_id: targetFamId,
						child_id: childId,
						pedigree_type: c.pedigreeType || "birth",
						order: String(idx + 1),
					});
				}
			});
		}
	}

	// 6. Також перевіряємо зворотні зв'язки FAMC в особах (якщо в FAM не було CHIL)
	for (const indi of parsedGedcom.individuals) {
		const rawId = cleanId(indi.id);
		const childId = indiIdMap.get(rawId) || rawId;

		for (const famc of indi.familiesAsChild || []) {
			const rawFamId = cleanId(famc.familyId);
			const targetFamId = famIdMap.get(rawFamId) || `FAM_${rawFamId}`;

			const linkExists = familyChildren.some(
				(fc) => fc.family_id === targetFamId && fc.child_id === childId,
			);

			if (!linkExists && createdFamilyIds.has(targetFamId)) {
				familyChildren.push({
					family_id: targetFamId,
					child_id: childId,
					pedigree_type: famc.pedigreeType || "birth",
					order: "1",
				});
			}
		}
	}

	// 7. Автоматична генерація сумісного familyRoles.csv для зворотної сумісності
	const familyRoles = buildFamilyRolesFromFamilies(families, familyChildren);

	// 8. Джерела (SOUR / REPO -> records, archives)
	for (const sour of parsedGedcom.sources || []) {
		const sId = cleanId(sour.id);
		records.push({
			record_id: `REC_GED_${sId}`,
			persons_ids: "",
			category: "gedcom_source",
			type: "source",
			title: sour.title || `Джерело ${sId}`,
			archive_id: sour.repoId ? `ARC_${cleanId(sour.repoId)}` : "",
			archive_ref: sour.publication || "",
			images: "",
			transcription: sour.author ? `Автор: ${sour.author}` : "",
			external_link: "",
			participants: "",
			date: "",
			place: "",
			region: "",
			owner: "",
		});
	}

	for (const repo of parsedGedcom.repositories || []) {
		const rId = cleanId(repo.id);
		archives.push({
			archive_id: `ARC_${rId}`,
			archive_name: repo.name || `Архів ${rId}`,
			archive_address: repo.address || "",
		});
	}

	return {
		basic,
		names,
		birth,
		death,
		baptism,
		funeral,
		marriage,
		families,
		familyChildren,
		familyRoles,
		places,
		records,
		archives,
		stats: {
			personsCount: basic.length,
			familiesCount: families.length,
			childrenCount: familyChildren.length,
			birthEvents: birth.length,
			deathEvents: death.length,
			marriageEvents: marriage.length,
			placesCount: places.length,
		},
	};
}
