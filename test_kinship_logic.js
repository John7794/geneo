const i18n = { t: (key) => null };
function isFemale(gender) { return gender === 'f'; }
function isMale(gender) { return gender === 'm'; }

function generateRelationshipLabel(distS, distT, genderTarget) {
	if (distS === undefined || distT === undefined || distS < 0 || distT < 0) {
		return "Невизначено";
	}
	const fem = isFemale(genderTarget);
	const mal = isMale(genderTarget);

	if (distT === 0) {
		if (distS === 0) return "Я";
		if (distS === 1) return fem ? "Мати" : mal ? "Батько" : "Один із батьків";
		if (distS === 2) return fem ? "Бабуся" : mal ? "Дід" : "Баба / Дід";
		if (distS === 3) return fem ? "Прабабуся" : mal ? "Прадід" : "Прабаба / Прадід";
		const count = Math.max(0, distS - 2);
		const basePra = "Пра";
		let pra = count === 1 ? basePra : `${basePra}(${count})`;
		const base = fem ? "бабуся" : mal ? "дід" : "баба / дід";
		return pra + base.toLowerCase();
	}
	if (distS === 0) {
		if (distT === 1) return fem ? "Донька" : mal ? "Син" : "Дитина";
		if (distT === 2) return fem ? "Онука" : mal ? "Онук" : "Онук / Онука";
		if (distT === 3) return fem ? "Правнучка" : mal ? "Правнук" : "Правнук / Правнучка";
		const count = Math.max(0, distT - 2);
		const basePra = "Пра";
		let pra = count === 1 ? basePra : `${basePra}(${count})`;
		const base = fem ? "онука" : mal ? "онук" : "онук / онука";
		return pra + base.toLowerCase();
	}

	const min = Math.min(distS, distT);
	const diff = Math.abs(distS - distT);
	
	const level = diff >= 2 ? min + 1 : min;
	
	let prefix = "";
	if (level === 1) prefix = "";
	else if (level === 2)
		prefix = fem ? "Двоюрідна " : mal ? "Двоюрідний " : "Двоюрідні ";
	else if (level === 3)
		prefix = fem ? "Троюрідна " : mal ? "Троюрідний " : "Троюрідні ";
	else prefix = `${level}-юрідн${fem ? "а" : mal ? "ий" : "і"} `;

	if (diff === 0) {
		if (level === 1) return fem ? "Сестра" : mal ? "Брат" : "Брат / Сестра";
		return `${prefix}${fem ? "сестра" : mal ? "брат" : "брат/сестра"}`;
	}

	const targetIsOlderGeneration = distT < distS;
	if (targetIsOlderGeneration) {
		let base = "";
		if (diff === 1) {
			base = fem ? "Тітка" : mal ? "Дядько" : "Тітка / Дядько";
		} else if (diff === 2) {
			base = fem ? "Бабуся" : mal ? "Дід" : "Баба / Дід";
		} else if (diff === 3) {
			base = fem ? "Прабабуся" : mal ? "Прадід" : "Прабаба / Прадід";
		} else {
			const count = diff - 2;
			const basePra = "Пра";
			let pra = count === 1 ? basePra : `${basePra}(${count})`;
			const rootBase = fem ? "бабуся" : mal ? "дід" : "баба / дід";
			base = pra + rootBase.toLowerCase();
		}
		if (level === 1) return base;
		return `${prefix}${base.toLowerCase()}`;
	} else {
		let base = "";
		if (diff === 1) {
			base = fem ? "Племінниця" : mal ? "Племінник" : "Племінник / Племінниця";
		} else if (diff === 2) {
			base = fem ? "Онука" : mal ? "Онук" : "Онук / Онука";
		} else if (diff === 3) {
			base = fem ? "Правнучка" : mal ? "Правнук" : "Правнук / Правнучка";
		} else {
			const count = diff - 2;
			const basePra = "Пра";
			let pra = count === 1 ? basePra : `${basePra}(${count})`;
			const rootBase = fem ? "онука" : mal ? "онук" : "онук / онука";
			base = pra + rootBase.toLowerCase();
		}
		if (level === 1) return base;
		return `${prefix}${base.toLowerCase()}`;
	}
}

console.log("distS=2, distT=1:", generateRelationshipLabel(2, 1, 'm')); // Дядько
console.log("distS=3, distT=2:", generateRelationshipLabel(3, 2, 'm')); // Двоюрідний дядько
console.log("distS=4, distT=3:", generateRelationshipLabel(4, 3, 'm')); // Троюрідний дядько

console.log("distS=3, distT=1:", generateRelationshipLabel(3, 1, 'm')); // Двоюрідний дід
console.log("distS=4, distT=2:", generateRelationshipLabel(4, 2, 'm')); // Троюрідний дід

console.log("distS=4, distT=1:", generateRelationshipLabel(4, 1, 'm')); // Двоюрідний прадід
console.log("distS=5, distT=2:", generateRelationshipLabel(5, 2, 'm')); // Троюрідний прадід

console.log("distS=1, distT=2:", generateRelationshipLabel(1, 2, 'm')); // Племінник
console.log("distS=2, distT=3:", generateRelationshipLabel(2, 3, 'm')); // Двоюрідний племінник

console.log("distS=1, distT=3:", generateRelationshipLabel(1, 3, 'm')); // Двоюрідний онук
console.log("distS=2, distT=4:", generateRelationshipLabel(2, 4, 'm')); // Троюрідний онук

console.log("distS=2, distT=2:", generateRelationshipLabel(2, 2, 'm')); // Двоюрідний брат
console.log("distS=3, distT=3:", generateRelationshipLabel(3, 3, 'm')); // Троюрідний брат
