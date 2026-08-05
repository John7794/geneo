
const i18n = { t: () => null };
function isFemale(g) { return g === 'f'; }
function isMale(g) { return g === 'm'; }
function generateRelationshipLabel(distS, distT, genderTarget) {
	if (distS === undefined || distT === undefined || distS < 0 || distT < 0) {
		return i18n.t("common.unknown") || "Невизначено";
	}

	const fem = isFemale(genderTarget);
	const mal = isMale(genderTarget);

	const M = Math.min(distS, distT);
	const K = Math.abs(distS - distT);
	const isAscending = distS > distT;

	// Розрахунок математичного індексу P
	let P = M;
	// Для K >= 2 ми зсуваємо P на 1 (тобто брат діда - це двоюрідний дід, а не рідний)
	if (M >= 1 && K >= 2) {
		P = M + 1;
	}

	// Генерація бічного префікса
	let prefix = "";
	if (M === 0 || P === 1) {
		prefix = "";
	} else if (P === 2) {
		prefix = fem ? "двоюрідна " : mal ? "двоюрідний " : "двоюрідні ";
	} else if (P === 3) {
		prefix = fem ? "троюрідна " : mal ? "троюрідний " : "троюрідні ";
	} else {
		prefix = `${P}-юрідн${fem ? "а " : mal ? "ий " : "і "}`;
	}

	// Генерація вертикального ідентифікатора
	let base = "";
	
	if (M === 0 && K === 0) {
		return "Я";
	}

	if (K === 0) {
		base = fem ? (i18n.t("roles.sister") || "сестра") : mal ? (i18n.t("roles.brother") || "брат") : (i18n.t("roles.sibling") || "брат / сестра");
	} else if (isAscending) {
		if (K === 1) {
			if (M === 0) base = fem ? (i18n.t("roles.mother") || "мати") : mal ? (i18n.t("roles.father") || "батько") : (i18n.t("roles.parent") || "один із батьків");
			else base = fem ? (i18n.t("roles.aunt") || "тітка") : mal ? (i18n.t("roles.uncle") || "дядько") : (i18n.t("roles.parentSibling") || "тітка / дядько");
		} else if (K === 2) {
			base = fem ? (i18n.t("roles.grandmother") || "бабуся") : mal ? (i18n.t("roles.grandfather") || "дід") : (i18n.t("roles.grandparent") || "баба / дід");
		} else {
			const N = K - 2;
			const basePra = i18n.t("kinship.praPrefix") || "пра";
			const pra = N === 1 ? basePra : `${basePra}(${N})`;
			const rootBase = fem ? (i18n.t("roles.grandmother") || "бабуся") : mal ? (i18n.t("roles.grandfather") || "дід") : (i18n.t("roles.grandparent") || "баба / дід");
			base = pra.toLowerCase() + rootBase.toLowerCase();
		}
	} else {
		if (K === 1) {
			if (M === 0) base = fem ? (i18n.t("roles.daughter") || "донька") : mal ? (i18n.t("roles.son") || "син") : (i18n.t("roles.child") || "дитина");
			else base = fem ? (i18n.t("roles.niece") || "племінниця") : mal ? (i18n.t("roles.nephew") || "племінник") : (i18n.t("roles.nibling") || "племінник / племінниця");
		} else if (K === 2) {
			base = fem ? (i18n.t("roles.granddaughter") || "онука") : mal ? (i18n.t("roles.grandson") || "онук") : (i18n.t("roles.grandchild") || "онук / онука");
		} else {
			const N = K - 2;
			const basePra = i18n.t("kinship.praPrefix") || "пра";
			const pra = N === 1 ? basePra : `${basePra}(${N})`;
			const rootBase = fem ? (i18n.t("roles.granddaughter") || "онука") : mal ? (i18n.t("roles.grandson") || "онук") : (i18n.t("roles.grandchild") || "онук / онука");
			base = pra.toLowerCase() + rootBase.toLowerCase();
		}
	}

	const result = `${prefix}${base.toLowerCase()}`;
	return result.charAt(0).toUpperCase() + result.slice(1);
}

console.log("7, 1 (m):", generateRelationshipLabel(7, 1, 'm'));
console.log("1, 7 (m):", generateRelationshipLabel(1, 7, 'm'));
console.log("7, 1 (f):", generateRelationshipLabel(7, 1, 'f'));
console.log("1, 7 (f):", generateRelationshipLabel(1, 7, 'f'));
