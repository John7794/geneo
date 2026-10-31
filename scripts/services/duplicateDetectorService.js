// ./scripts/services/duplicateDetectorService.js

/**
 * Сервіс інтелектуального виявлення потенційних дублікатів та збігів осіб (Smart Duplicate Matching)
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

function areNamesEquivalent(nameA, nameB) {
	const a = cleanText(nameA);
	const b = cleanText(nameB);
	if (!a || !b) return false;
	if (a === b) return true;

	for (const [canonical, variants] of Object.entries(NAME_VARIANTS)) {
		const normCan = cleanText(canonical);
		const all = [normCan, ...variants.map(cleanText)];
		if (all.includes(a) && all.includes(b)) {
			return true;
		}
	}
	return false;
}

function levenshtein(a, b) {
	if (!a || !b) return (a || b).length;
	const m = a.length,
		n = b.length;
	const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
	for (let i = 0; i <= m; i++) dp[i][0] = i;
	for (let j = 0; j <= n; j++) dp[0][j] = j;

	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			dp[i][j] = Math.min(
				dp[i - 1][j] + 1,
				dp[i][j - 1] + 1,
				dp[i - 1][j - 1] + cost,
			);
		}
	}
	return dp[m][n];
}

export class DuplicateDetectorService {
	/**
	 * Порівняння двох осіб на предмет ідентичності
	 */
	static comparePersons(personA, personB) {
		if (!personA || !personB || String(personA.id) === String(personB.id)) {
			return { isMatch: false, score: 0, confidence: "none", reasons: [] };
		}

		let score = 0;
		const reasons = [];

		const surA = cleanText(personA.surname || personA.raw?.surname || "");
		const surB = cleanText(personB.surname || personB.raw?.surname || "");
		const nameA = cleanText(personA.name || personA.first_name || personA.raw?.name || "");
		const nameB = cleanText(personB.name || personB.first_name || personB.raw?.name || "");

		// 1. Прізвище
		if (surA && surB) {
			if (surA === surB) {
				score += 35;
				reasons.push("Однакове прізвище");
			} else if (levenshtein(surA, surB) <= 2) {
				score += 20;
				reasons.push("Схоже прізвище");
			} else {
				if (personA.gender === "female" || personB.gender === "female") {
					score -= 10;
				} else {
					score -= 30;
				}
			}
		}

		// 2. Ім'я
		if (nameA && nameB) {
			if (nameA === nameB) {
				score += 35;
				reasons.push("Однакове ім'я");
			} else if (areNamesEquivalent(nameA, nameB)) {
				score += 30;
				reasons.push("Споріднені форми імені");
			} else if (levenshtein(nameA, nameB) <= 1) {
				score += 20;
				reasons.push("Схоже ім'я (описка)");
			} else {
				score -= 40;
			}
		}

		// 3. Рік народження
		const yA = extractYear(personA.birthDate || personA.dates?.birth || personA.raw?.birth_year || personA.raw?.fam_year);
		const yB = extractYear(personB.birthDate || personB.dates?.birth || personB.raw?.birth_year || personB.raw?.fam_year);

		if (yA && yB) {
			const diff = Math.abs(yA - yB);
			if (diff === 0) {
				score += 25;
				reasons.push(`Збіг року народження (${yA})`);
			} else if (diff <= 2) {
				score += 20;
				reasons.push(`Близькі роки народження (${yA} та ${yB})`);
			} else if (diff <= 5) {
				score += 10;
				reasons.push(`Різниця років народження до 5 років (${yA} та ${yB})`);
			} else if (diff > 12) {
				score -= 50;
			}
		}

		// 4. Стать
		const gA = personA.gender || personA.raw?.gender;
		const gB = personB.gender || personB.raw?.gender;
		if (gA && gB && gA !== "unknown" && gB !== "unknown") {
			if (gA !== gB) {
				return { isMatch: false, score: 0, confidence: "none", reasons: ["Різна стать"] };
			}
		}

		// 5. Батьки / подружжя
		const fatherA = personA.parents?.find((p) => p.gender === "male");
		const fatherB = personB.parents?.find((p) => p.gender === "male");
		if (fatherA && fatherB) {
			const fNameA = cleanText(fatherA.name || fatherA.first_name || "");
			const fNameB = cleanText(fatherB.name || fatherB.first_name || "");
			if (fNameA && fNameB && (fNameA === fNameB || areNamesEquivalent(fNameA, fNameB))) {
				score += 15;
				reasons.push("Спільне ім'я батька");
			}
		}

		const finalScore = Math.max(0, Math.min(100, score));
		let confidence = "none";
		if (finalScore >= 80) confidence = "high";
		else if (finalScore >= 60) confidence = "medium";
		else if (finalScore >= 45) confidence = "low";

		return {
			isMatch: finalScore >= 55,
			score: finalScore,
			confidence,
			reasons,
		};
	}

	/**
	 * Пошук потенційних дублікатів для однієї конкретної персони в межах дерева
	 */
	static findMatchesForPerson(targetPerson, engine, maxResults = 3) {
		if (!targetPerson || !engine || !engine.people) return [];

		const matches = [];
		const targetId = String(targetPerson.id).trim();

		for (const [id, candidate] of engine.people.entries()) {
			if (id === targetId) continue;

			const result = this.comparePersons(targetPerson, candidate);
			if (result.isMatch) {
				matches.push({
					person: candidate,
					score: result.score,
					confidence: result.confidence,
					reasons: result.reasons,
				});
			}
		}

		matches.sort((a, b) => b.score - a.score);
		return matches.slice(0, maxResults);
	}
}
