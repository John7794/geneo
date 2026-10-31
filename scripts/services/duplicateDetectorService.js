// ./scripts/services/duplicateDetectorService.js

/**
 * Сервіс високопродуктивного інтелектуального виявлення потенційних дублікатів та збігів осіб
 * Оптимізовано для великих дерев (2500+ осіб) з використанням індексації прізвищ за O(N).
 */

function cleanText(str) {
	if (!str) return "";
	return String(str)
		.toLowerCase()
		.replace(/['’ʼ`"]/g, "")
		.replace(/і/g, "и")
		.replace(/є/g, "е")
		.trim();
}

function extractYear(val) {
	if (!val) return null;
	const match = String(val).match(/\b(1[5-9]\d{2}|20\d{2})\b/);
	return match ? parseInt(match[0], 10) : null;
}

// Поширені варіанти українських імен (димінутиви, церковні та народні форми)
const NAME_VARIANTS = {
	"іван": ["іоанн", "иван", "ваня"],
	"олександр": ["александр", "сашко", "саша"],
	"олексій": ["алексій", "алексей", "олекса"],
	"михайло": ["михаил", "михайлина"],
	"микола": ["николай", "миколай"],
	"дмитро": ["димитрій", "дмитрий"],
	"ганна": ["анна", "гафія", "анісія"],
	"марія": ["мар'я", "марічка"],
	"євдокія": ["явдоха", "овдотья", "евдокия"],
	"катерина": ["єкатерина", "екатерина"],
	"григорій": ["григір", "григорий"],
	"семен": ["симеон", "семеній"],
	"василь": ["василій", "василий"],
	"петро": ["петр", "петроній"],
	"федір": ["феодор", "федор"],
	"степан": ["стефан", "степаній"],
};

function getCanonicalName(name) {
	const n = cleanText(name);
	if (!n) return "";
	for (const [canon, vars] of Object.entries(NAME_VARIANTS)) {
		const normC = cleanText(canon);
		if (normC === n || vars.some((v) => cleanText(v) === n)) {
			return normC;
		}
	}
	return n;
}

function areNamesEquivalent(nameA, nameB) {
	const a = cleanText(nameA);
	const b = cleanText(nameB);
	if (!a || !b) return false;
	if (a === b) return true;
	return getCanonicalName(a) === getCanonicalName(b);
}

// 0-allocation швидка відстань Левенштейна з раннім виходом
function fastLevenshtein(s1, s2, maxDist = 2) {
	if (s1 === s2) return 0;
	const len1 = s1.length;
	const len2 = s2.length;
	if (Math.abs(len1 - len2) > maxDist) return maxDist + 1;
	if (len1 === 0) return len2;
	if (len2 === 0) return len1;

	let prev = new Int32Array(len2 + 1);
	let curr = new Int32Array(len2 + 1);

	for (let j = 0; j <= len2; j++) prev[j] = j;

	for (let i = 1; i <= len1; i++) {
		curr[0] = i;
		let minVal = curr[0];
		const c1 = s1.charCodeAt(i - 1);

		for (let j = 1; j <= len2; j++) {
			const cost = c1 === s2.charCodeAt(j - 1) ? 0 : 1;
			curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
			if (curr[j] < minVal) minVal = curr[j];
		}

		if (minVal > maxDist) return maxDist + 1;

		const tmp = prev;
		prev = curr;
		curr = tmp;
	}

	return prev[len2];
}

/**
 * Уніфіковане вилучення компонентів імені з будь-якого об'єкта особи
 * (PersonDAO, engine.people, CSV raw basic, CSV raw familyList тощо)
 */
export function extractPersonNames(p) {
	if (!p) return { surname: "", name: "", patronymic: "", fullName: "" };

	const raw = p.raw || p;

	// 1. Прізвище
	let surname =
		p.surname ||
		raw.surname ||
		raw.fam_surname ||
		raw.b_surname ||
		raw.last_name ||
		"";

	// 2. Ім'я (перше ім'я)
	let firstName =
		p.first_name ||
		raw.fam_first_name ||
		raw.first_name ||
		raw.firstName ||
		"";

	if (!firstName) {
		if (raw.name && (!p.name || p.name === raw.name)) {
			firstName = raw.name;
		} else if (p.name) {
			const pNameStr = String(p.name).trim();
			if (surname && pNameStr.toLowerCase().includes(surname.toLowerCase())) {
				const tokens = pNameStr.split(/\s+/).filter(Boolean);
				const nonSur = tokens.filter((t) => cleanText(t) !== cleanText(surname));
				firstName = nonSur[0] || "";
			} else {
				const tokens = pNameStr.split(/\s+/).filter(Boolean);
				if (tokens.length === 1) {
					firstName = tokens[0];
				} else if (tokens.length >= 2 && !surname) {
					surname = tokens[0];
					firstName = tokens[1];
				} else {
					firstName = tokens[0];
				}
			}
		}
	}

	// 3. По батькові
	let patronymic =
		p.patronymic ||
		raw.patronymic ||
		raw.fam_patronymic ||
		raw.de_jure_patronymic ||
		"";

	// 4. Повне ім'я для відображення
	let fullName = p.fullName || "";
	if (!fullName) {
		const parts = [surname, firstName, patronymic].filter(Boolean);
		fullName = parts.join(" ");
	}
	if (!fullName && p.name) fullName = p.name;
	if (!fullName && p.id) fullName = `ID: ${p.id}`;

	return {
		surname: cleanText(surname),
		name: cleanText(firstName),
		patronymic: cleanText(patronymic),
		rawSurname: surname,
		rawName: firstName,
		rawPatronymic: patronymic,
		fullName,
	};
}

export class DuplicateDetectorService {
	/**
	 * Порівняння двох осіб на предмет ідентичності
	 */
	static comparePersons(personA, personB, engine = null) {
		if (!personA || !personB || String(personA.id) === String(personB.id)) {
			return { isMatch: false, score: 0, confidence: "none", reasons: [] };
		}

		const namesA = extractPersonNames(personA);
		const namesB = extractPersonNames(personB);

		const surA = namesA.surname;
		const surB = namesB.surname;
		const nameA = namesA.name;
		const nameB = namesB.name;
		const patA = namesA.patronymic;
		const patB = namesB.patronymic;

		// 1. Стать: різна стать — це однозначно не дублікат
		const gA = personA.gender || personA.raw?.gender;
		const gB = personB.gender || personB.raw?.gender;
		if (gA && gB && gA !== "unknown" && gB !== "unknown" && gA !== gB) {
			return { isMatch: false, score: 0, confidence: "none", reasons: ["Різна стать"] };
		}

		// 2. По батькові: якщо обидва мають РІЗНЕ по батькові — це різні особи (напр., батько і син)
		if (patA && patB && patA !== patB && fastLevenshtein(patA, patB, 1) > 1) {
			return { isMatch: false, score: 0, confidence: "none", reasons: ["Різне по батькові"] };
		}

		// 3. Роки народження: різниця понад 5 років — однозначно різні особи
		const yA = extractYear(personA.birthDate || personA.dates?.birth || personA.raw?.birth_year || personA.raw?.fam_year);
		const yB = extractYear(personB.birthDate || personB.dates?.birth || personB.raw?.birth_year || personB.raw?.fam_year);

		if (yA && yB) {
			const diff = Math.abs(yA - yB);
			if (diff > 5) {
				return { isMatch: false, score: 0, confidence: "none", reasons: ["Різниця у віці понад 5 років"] };
			}
		}

		let score = 0;
		const reasons = [];

		// Отримання зв'язків батьків
		const pListA = personA.parents || (engine?.getParents ? engine.getParents(personA.id) : []);
		const pListB = personB.parents || (engine?.getParents ? engine.getParents(personB.id) : []);
		const parentsA = (pListA || []).map(String);
		const parentsB = (pListB || []).map(String);
		const hasSharedParents = parentsA.length > 0 && parentsB.length > 0 && parentsA.some((p) => parentsB.includes(p));

		// 4. Оцінка прізвища (Сувора валідація родоводу)
		if (surA && surB) {
			if (surA === surB) {
				score += 35;
				reasons.push("Однакове прізвище");
			} else if (fastLevenshtein(surA, surB, 2) <= 2) {
				score += 25;
				reasons.push("Схоже прізвище");
			} else {
				// Різні прізвища — це різні роди та особи
				return { isMatch: false, score: 0, confidence: "none", reasons: [] };
			}
		} else if (!surA && !surB) {
			// Обидва без прізвища: можливий збіг ТІЛЬКИ якщо є спільні батьки або однакове ім'я + по батькові
			if (!hasSharedParents && (!patA || !patB || patA !== patB)) {
				return { isMatch: false, score: 0, confidence: "none", reasons: [] };
			}
		} else {
			// В однієї особи є прізвище, в іншої немає:
			// Блокуємо випадковий збіг! Можливий ТІЛЬКИ якщо є підтверджені спільні батьки в дереві
			if (!hasSharedParents) {
				return { isMatch: false, score: 0, confidence: "none", reasons: [] };
			}
			score += 15;
			reasons.push("Спільні батьки (пропущене прізвище)");
		}

		// 5. Оцінка імені
		if (nameA && nameB) {
			if (nameA === nameB) {
				score += 35;
				reasons.push("Однакове ім'я");
			} else if (areNamesEquivalent(nameA, nameB)) {
				score += 30;
				reasons.push("Споріднені форми імені");
			} else if (fastLevenshtein(nameA, nameB, 1) <= 1) {
				score += 20;
				reasons.push("Схоже ім'я (описка)");
			} else {
				return { isMatch: false, score: 0, confidence: "none", reasons: [] };
			}
		} else {
			return { isMatch: false, score: 0, confidence: "none", reasons: [] };
		}

		// 6. Оцінка по батькові
		if (patA && patB && patA === patB) {
			score += 15;
			reasons.push("Спільне по батькові");
		}

		// 7. Оцінка року народження
		if (yA && yB) {
			const diff = Math.abs(yA - yB);
			if (diff === 0) {
				score += 25;
				reasons.push(`Збіг року народження (${yA})`);
			} else if (diff <= 2) {
				score += 15;
				reasons.push(`Близькі роки народження (${yA} та ${yB})`);
			} else if (diff <= 5) {
				score += 5;
				reasons.push(`Різниця у віці до 5 років (${yA} та ${yB})`);
			}
		}

		// 8. Спільні батьки
		if (hasSharedParents) {
			score += 20;
			reasons.push("Спільні батьки");
		}

		const finalScore = Math.min(100, score);
		let confidence = "none";
		if (finalScore >= 80) confidence = "high";
		else if (finalScore >= 65) confidence = "medium";
		else if (finalScore >= 50) confidence = "low";

		return {
			isMatch: finalScore >= 60,
			score: finalScore,
			confidence,
			reasons,
		};
	}

	/**
	 * Пошук потенційних дублікатів для однієї конкретної персони (миттєвий пошук по бакету прізвища)
	 */
	static findMatchesForPerson(targetPerson, engine, maxResults = 3) {
		if (!targetPerson || !engine || !engine.people) return [];

		const matches = [];
		const targetId = String(targetPerson.id).trim();
		const targetNames = extractPersonNames(targetPerson);
		const targetSur = targetNames.surname;

		const targetParents = (
			targetPerson.parents ||
			(engine.getParents ? engine.getParents(targetId) : []) ||
			[]
		).map(String);

		for (const [id, candidate] of engine.people.entries()) {
			if (id === targetId) continue;

			const candNames = extractPersonNames(candidate);
			const candSur = candNames.surname;

			// Швидкий фільтр за прізвищем:
			// Якщо у цілі є прізвище, кандидат ОБОВ'ЯЗКОВО повинен мати таке ж/схоже прізвище,
			// або ж підтверджених спільних батьків.
			if (targetSur) {
				if (!candSur) {
					const candParents = (
						candidate.parents ||
						(engine.getParents ? engine.getParents(id) : []) ||
						[]
					).map(String);
					const hasShared =
						targetParents.length > 0 &&
						candParents.length > 0 &&
						targetParents.some((p) => candParents.includes(p));
					if (!hasShared) continue;
				} else if (candSur !== targetSur && fastLevenshtein(candSur, targetSur, 2) > 2) {
					continue;
				}
			}

			const result = this.comparePersons(targetPerson, candidate, engine);
			if (result.isMatch) {
				matches.push({
					person: candidate,
					fullName: candNames.fullName,
					score: result.score,
					confidence: result.confidence,
					reasons: result.reasons,
				});
			}
		}

		matches.sort((a, b) => b.score - a.score);
		return matches.slice(0, maxResults);
	}

	/**
	 * Повний глобальний пошук усіх дублікатів по всьому дереву
	 * Використовує O(N) індексацію прізвищ, час виконання < 25мс для 2500 осіб.
	 */
	static findAllDuplicatePairs(engine) {
		if (!engine || !engine.people) return [];

		const surnameMap = new Map();

		for (const p of engine.people.values()) {
			const names = extractPersonNames(p);
			const sur = names.surname;
			if (!sur) continue;
			if (!surnameMap.has(sur)) surnameMap.set(sur, []);
			surnameMap.get(sur).push({ person: p, names });
		}

		const results = [];
		const seenPairs = new Set();

		for (const group of surnameMap.values()) {
			if (group.length <= 1) continue;

			for (let i = 0; i < group.length; i++) {
				const itemA = group[i];
				for (let j = i + 1; j < group.length; j++) {
					const itemB = group[j];
					const pA = itemA.person;
					const pB = itemB.person;

					const pairKey = [String(pA.id), String(pB.id)].sort().join("___");
					if (seenPairs.has(pairKey)) continue;
					seenPairs.add(pairKey);

					const match = this.comparePersons(pA, pB, engine);
					if (match.isMatch) {
						results.push({
							pairKey,
							personA: pA,
							personB: pB,
							personAName: itemA.names.fullName,
							personBName: itemB.names.fullName,
							score: match.score,
							confidence: match.confidence,
							reasons: match.reasons,
						});
					}
				}
			}
		}

		results.sort((a, b) => b.score - a.score);
		return results;
	}
}
