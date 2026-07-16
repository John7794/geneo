const fs = require('fs');
const file = 'scripts/components/ui/formatters/name.js';
let content = fs.readFileSync(file, 'utf8');

// Replace everything from export function formatPersonNameHtml to its closing brace
// Since we know the next function is getFormattedGenitiveNameHtml, we can split
const parts = content.split('export function getFormattedGenitiveNameHtml(item) {');

const newFunc = `export function formatPersonNameHtml(person, options = {}) {
	const unknownLabelRaw = i18n.t("common.unknown") || "Невідомо";
	const unknownLabel = escapeHtml(unknownLabelRaw);
	if (!person || (!person.name && !person.surname)) return unknownLabel;

	const nameRaw = String(person.name || "").trim();
	let surnameRaw = String(person.surname || "")
		.trim()
		.toUpperCase();

	const isFem = normalizeGender(person.gender) === "f";
    
	// 🔥 ВИМОГА: Дівоче прізвище для народження, хрещення, шлюбу.
	// Прізвище за чоловіком для смерті, поховання.
	const eventType = options.eventType || options; 
	if (["birth", "baptism", "marriage"].includes(eventType)) {
		if (person.maidenName) {
			surnameRaw = String(person.maidenName).trim().toUpperCase();
		}
	} else if (["death", "funeral"].includes(eventType)) {
		if (person.marriedName) {
			const mSurnames = person.marriedName.split(/[,;]/).map(x => x.trim()).filter(Boolean);
			if (mSurnames.length > 0) {
				surnameRaw = mSurnames[mSurnames.length - 1].toUpperCase();
			}
		} else if (isFem && person.maidenName) {
			surnameRaw = String(person.maidenName).trim().toUpperCase();
		}
	} else {
		// default logic: Дівоче прізвище виводимо ТІЛЬКИ для жінок
		if (isFem && person.maidenName) {
			const cleanMaiden = String(person.maidenName).trim().toUpperCase();
			if (cleanMaiden) surnameRaw = cleanMaiden;
		}
	}

	const name = escapeHtml(nameRaw);
	const surname = escapeHtml(surnameRaw);
	const htmlBuffer = [];

	// Ім'я
	if (name) {
		const firstClass =
			UI_CLASSES.kinshipCardNameFirst || "kinship-card-name-first";
		htmlBuffer.push(\`<span class="\${firstClass}">\${name}</span>\`);
	}
	// Прізвище
	if (surname) {
		const surnameClass =
			UI_CLASSES.kinshipCardNameSurname || "kinship-card-name-surname";
		htmlBuffer.push(\`<span class="\${surnameClass}">\${surname}</span>\`);
	}

	return htmlBuffer.length > 0 ? htmlBuffer.join(" ") : unknownLabel;
}

/**
 * РІВЕНЬ UI: Генерує ім'я в родовому відмінку з розбиттям по рядках
 * @param {Object|string} item - Об'єкт родича з ланцюжка або просто рядок
 * @returns {string} Екранований HTML рядок з переносами
 */
export function getFormattedGenitiveNameHtml(item) {`;

// Just find the start of the first function and replace until the second
const startIndex = content.indexOf('export function formatPersonNameHtml(person) {');
const endIndex = content.indexOf('export function getFormattedGenitiveNameHtml(item) {');

if (startIndex !== -1 && endIndex !== -1) {
    const before = content.substring(0, startIndex);
    const after = content.substring(endIndex + 'export function getFormattedGenitiveNameHtml(item) {'.length);
    fs.writeFileSync(file, before + newFunc + after);
    console.log('Successfully patched name.js');
} else {
    console.log('Failed to find boundaries in name.js');
}
