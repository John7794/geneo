// ./scripts/services/treeAuditService.js

import { DuplicateDetectorService } from "./duplicateDetectorService.js";

/**
 * Сервіс високопродуктивного аудиту родинного дерева: виявлення потенційних дублікатів,
 * невідповідностей віку батьків, надто довгого життя та хронологічних помилок.
 * Оптимізовано для негайного відгуку UI (використовує O(N) індексацію та кешування).
 */

const STORAGE_KEY_IGNORED = "geneo_ignored_audit_issues";

function extractYear(val) {
	if (!val) return null;
	const match = String(val).match(/\b(1[5-9]\d{2}|20\d{2})\b/);
	return match ? parseInt(match[0], 10) : null;
}

// Внутрішній кеш результатів аудиту для уникнення повторних розрахунків
let _cachedRawAudit = null;
let _cachedEngineRef = null;

export class TreeAuditService {
	static clearCache() {
		_cachedRawAudit = null;
		_cachedEngineRef = null;
	}

	static getIgnoredIds() {
		try {
			const raw = localStorage.getItem(STORAGE_KEY_IGNORED);
			return raw ? JSON.parse(raw) : [];
		} catch (e) {
			return [];
		}
	}

	static ignoreIssue(issueId) {
		const list = this.getIgnoredIds();
		if (!list.includes(issueId)) {
			list.push(issueId);
			try {
				localStorage.setItem(STORAGE_KEY_IGNORED, JSON.stringify(list));
			} catch (e) {}
		}
	}

	static unignoreIssue(issueId) {
		let list = this.getIgnoredIds();
		list = list.filter((id) => id !== issueId);
		try {
			localStorage.setItem(STORAGE_KEY_IGNORED, JSON.stringify(list));
		} catch (e) {}
	}

	static clearIgnored() {
		try {
			localStorage.removeItem(STORAGE_KEY_IGNORED);
		} catch (e) {}
	}

	/**
	 * Повний запуск аудиту бази родоводу
	 */
	static runFullAudit(engine) {
		if (!engine || !engine.people) {
			return {
				duplicates: [],
				parentAnomalies: [],
				lifespanAnomalies: [],
				ignored: [],
				allActive: [],
				totalActive: 0,
			};
		}

		const ignoredIds = new Set(this.getIgnoredIds());

		// Якщо дерево не змінювалося, використовуємо збережені сирі зауваження
		let rawIssues;
		if (_cachedRawAudit && _cachedEngineRef === engine) {
			rawIssues = _cachedRawAudit;
		} else {
			rawIssues = this._computeAudit(engine);
			_cachedRawAudit = rawIssues;
			_cachedEngineRef = engine;
		}

		const duplicates = [];
		const parentAnomalies = [];
		const lifespanAnomalies = [];
		const ignored = [];

		for (const item of rawIssues.duplicates) {
			if (ignoredIds.has(item.id)) ignored.push(item);
			else duplicates.push(item);
		}

		for (const item of rawIssues.parentAnomalies) {
			if (ignoredIds.has(item.id)) ignored.push(item);
			else parentAnomalies.push(item);
		}

		for (const item of rawIssues.lifespanAnomalies) {
			if (ignoredIds.has(item.id)) ignored.push(item);
			else lifespanAnomalies.push(item);
		}

		const allActive = [...duplicates, ...parentAnomalies, ...lifespanAnomalies];

		return {
			duplicates,
			parentAnomalies,
			lifespanAnomalies,
			ignored,
			allActive,
			totalActive: allActive.length,
		};
	}

	static _computeAudit(engine) {
		const duplicates = [];
		const parentAnomalies = [];
		const lifespanAnomalies = [];

		// 1. Пошук потенційних дублікатів (швидкий індексований пошук за O(N))
		const dupPairs = DuplicateDetectorService.findAllDuplicatePairs(engine);
		for (const match of dupPairs) {
			const issueId = `dup_${match.pairKey}`;
			duplicates.push({
				id: issueId,
				type: "duplicate",
				category: "duplicates",
				severity: "duplicate",
				title: "Потенційний дублікат особи",
				personId: match.personA.id,
				person: match.personA,
				personA: match.personA,
				personB: match.personB,
				score: match.score,
				confidence: match.confidence,
				description: `Можливий дублікат: «${match.personA.name || match.personA.fullName}» та «${match.personB.name || match.personB.fullName}». Схожість ${match.score}%.`,
				reasons: match.reasons,
			});
		}

		// 2. Хронологічні аномалії та вік батьків
		const peopleArr = Array.from(engine.people.values());
		const currentYear = new Date().getFullYear();

		for (const p of peopleArr) {
			const pId = String(p.id).trim();
			const pName = p.name || p.fullName || `ID: ${pId}`;

			const bYear = extractYear(p.birthDate || p.dates?.birth || p.raw?.birth_year || p.raw?.fam_year);
			const dYear = extractYear(p.deathDate || p.dates?.death || p.raw?.death_year);

			// 2.1. Перевірка тривалості життя
			if (bYear && dYear) {
				if (dYear < bYear) {
					lifespanAnomalies.push({
						id: `life_death_before_birth_${pId}`,
						type: "chronology",
						category: "lifespanAnomalies",
						severity: "error",
						personId: p.id,
						person: p,
						title: "Смерть раніше за народження",
						description: `${pName}: зазначено рік смерті (${dYear}) раніше за рік народження (${bYear}).`,
					});
				} else if (dYear - bYear > 115) {
					const age = dYear - bYear;
					lifespanAnomalies.push({
						id: `life_longevity_${pId}`,
						type: "longevity",
						category: "lifespanAnomalies",
						severity: "warning",
						personId: p.id,
						person: p,
						title: "Надто довгий період життя",
						description: `${pName}: розрахований вік життя становить ${age} років (${bYear}–${dYear}). Потребує перевірки першоджерел.`,
					});
				}
			} else if (bYear && !dYear) {
				if (currentYear - bYear > 120 && p.isAlive) {
					lifespanAnomalies.push({
						id: `life_alive_over_120_${pId}`,
						type: "longevity",
						category: "lifespanAnomalies",
						severity: "warning",
						personId: p.id,
						person: p,
						title: "Статус «Живий» при віці понад 120 років",
						description: `${pName} народився(-лась) у ${bYear} році (${currentYear - bYear} р. тому), проте не позначено як померлий(-ла).`,
					});
				}
			}

			// 2.2. Перевірка віку батьків
			const parents = p.parents || [];
			for (const parentRef of parents) {
				const parent = engine.getPerson(parentRef.id || parentRef);
				if (!parent) continue;

				const parentId = String(parent.id).trim();
				const parentName = parent.name || parent.fullName || `ID: ${parentId}`;
				const parentBYear = extractYear(parent.birthDate || parent.dates?.birth || parent.raw?.birth_year || parent.raw?.fam_year);
				const parentDYear = extractYear(parent.deathDate || parent.dates?.death || parent.raw?.death_year);
				const isMother = parent.gender === "female";

				if (bYear && parentBYear) {
					const parentAgeAtBirth = bYear - parentBYear;

					if (parentAgeAtBirth < 13) {
						parentAnomalies.push({
							id: `parent_too_young_${parentId}_${pId}`,
							type: "parent_age",
							category: "parentAnomalies",
							severity: "error",
							personId: p.id,
							person: p,
							relatedPersonId: parent.id,
							relatedPerson: parent,
							title: `Надто юний вік ${isMother ? "матері" : "батька"}`,
							description: `${parentName} народив(-ла) дитину «${pName}» у віці ${parentAgeAtBirth} років (батько/мати: ${parentBYear} р.н., дитина: ${bYear} р.н.).`,
						});
					} else if (isMother && parentAgeAtBirth > 53) {
						parentAnomalies.push({
							id: `mother_too_old_${parentId}_${pId}`,
							type: "parent_age",
							category: "parentAnomalies",
							severity: "warning",
							personId: p.id,
							person: p,
							relatedPersonId: parent.id,
							relatedPerson: parent,
							title: "Незвично поважний вік матері при пологах",
							description: `Мати ${parentName} народила «${pName}» у віці ${parentAgeAtBirth} років (мати: ${parentBYear} р.н., дитина: ${bYear} р.н.).`,
						});
					} else if (!isMother && parentAgeAtBirth > 85) {
						parentAnomalies.push({
							id: `father_too_old_${parentId}_${pId}`,
							type: "parent_age",
							category: "parentAnomalies",
							severity: "warning",
							personId: p.id,
							person: p,
							relatedPersonId: parent.id,
							relatedPerson: parent,
							title: "Поважний вік батька при народженні дитини",
							description: `Батько ${parentName} мав вік ${parentAgeAtBirth} років на момент народження дитини «${pName}».`,
						});
					}
				}

				// Народження після смерті батька/матері
				if (bYear && parentDYear) {
					if (isMother && bYear > parentDYear) {
						parentAnomalies.push({
							id: `born_after_mother_death_${parentId}_${pId}`,
							type: "chronology",
							category: "parentAnomalies",
							severity: "error",
							personId: p.id,
							person: p,
							relatedPersonId: parent.id,
							relatedPerson: parent,
							title: "Народження після смерті матері",
							description: `Дитина «${pName}» (${bYear} р.н.) народилася після року смерті матері ${parentName} (${parentDYear} р.с.).`,
						});
					} else if (!isMother && bYear - parentDYear > 1) {
						parentAnomalies.push({
							id: `born_after_father_death_${parentId}_${pId}`,
							type: "chronology",
							category: "parentAnomalies",
							severity: "error",
							personId: p.id,
							person: p,
							relatedPersonId: parent.id,
							relatedPerson: parent,
							title: "Народження значно пізніше за смерть батька",
							description: `Дитина «${pName}» народилася у ${bYear} році, тоді як батько ${parentName} помер у ${parentDYear} році (різниця понад 1 рік).`,
						});
					}
				}
			}
		}

		return {
			duplicates,
			parentAnomalies,
			lifespanAnomalies,
		};
	}
}
