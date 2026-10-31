// ./scripts/services/gedcom/nameParser.js

/**
 * Парсер імен для стандарту GEDCOM з урахуванням української та слов'янської ономастики
 * (по батькові, дошлюбні прізвища, придомки, гербові псевдоніми).
 */

const PATRONYMIC_REGEX = /([А-ЯІЇЄҐA-Z][а-яіїєґa-z]+(?:ович|евич|євич|івна|ївна|овна|евна|ич))$/i;

/**
 * Парсить GEDCOM рядок NAME та підтеги (GIVN, SURN, NICK, _PATR) у структурований об'єкт.
 * 
 * @param {string} rawName - Рядок тегу NAME (наприклад "Іван Петрович /Коваленко/")
 * @param {Object} subTags - Підтеги (GIVN, SURN, NICK, _PATR, NPFX, NSFX)
 * @returns {Object} - { name, surname, patronymic, maidenSurname, nobleNickname, prefix, suffix, fullName }
 */
export function parseGedcomName(rawName = "", subTags = {}) {
	let name = (subTags.GIVN || "").trim();
	let surname = (subTags.SURN || "").trim();
	let patronymic = (subTags._PATR || subTags._PATRONYMIC || "").trim();
	let nobleNickname = (subTags.NICK || "").trim();
	let prefix = (subTags.NPFX || "").trim();
	let suffix = (subTags.NSFX || "").trim();
	let maidenSurname = (subTags._MARNM || "").trim();

	let str = rawName.trim();

	// 1. Витягуємо прізвище у слешах /Surname/
	const slashMatch = str.match(/\/([^\/]+)\//);
	if (slashMatch) {
		if (!surname) surname = slashMatch[1].trim();
		// Видаляємо /Surname/ для аналізу решти
		str = str.replace(/\/([^\/]+)\//, "").trim();
	}

	// 2. Якщо ім'я не було вказано окремим тегом GIVN — аналізуємо залишкову частину
	if (!name && str) {
		const parts = str.split(/\s+/).filter(Boolean);
		if (parts.length >= 2) {
			// Перевіряємо, чи останнє слово — це по батькові
			const lastWord = parts[parts.length - 1];
			if (PATRONYMIC_REGEX.test(lastWord)) {
				if (!patronymic) patronymic = lastWord;
				name = parts.slice(0, parts.length - 1).join(" ");
			} else {
				name = parts[0];
				if (parts.length > 1 && !patronymic) {
					patronymic = parts.slice(1).join(" ");
				}
			}
		} else if (parts.length === 1) {
			name = parts[0];
		}
	}

	// 3. Якщо в GIVN було записано "Ім'я По батькові", виокремлюємо по батькові
	if (name && !patronymic) {
		const givnParts = name.split(/\s+/).filter(Boolean);
		if (givnParts.length >= 2) {
			const lastPart = givnParts[givnParts.length - 1];
			if (PATRONYMIC_REGEX.test(lastPart)) {
				patronymic = lastPart;
				name = givnParts.slice(0, givnParts.length - 1).join(" ");
			}
		}
	}

	// 4. Пошук дівочого прізвища (в дужках або з позначкою "нар." / "з дому")
	if (surname) {
		const maidenMatch = surname.match(/[\(\[](?:нар\.?\s*|з\s+дому\s*)?([^\)\]]+)[\)\]]/i);
		if (maidenMatch) {
			if (!maidenSurname) maidenSurname = maidenMatch[1].trim();
			surname = surname.replace(/[\(\[][^\)\]]+[\)\]]/, "").trim();
		}
	}

	// Повне відображуване ім'я
	const fullParts = [surname, name, patronymic].filter(Boolean);
	const fullName = fullParts.join(" ") || "Невідома особа";

	return {
		name,
		surname,
		patronymic,
		maidenSurname,
		nobleNickname,
		prefix,
		suffix,
		fullName,
	};
}

/**
 * Форматує об'єкт імені Geneo у блок рядків GEDCOM
 * 
 * @param {Object} person - об'єкт з полями name, surname, patronymic, nobleNickname
 * @returns {Array<string>} - масив рядків для вставки у блок INDI
 */
export function formatToGedcomNameLines({
	name = "",
	surname = "",
	patronymic = "",
	nobleNickname = "",
} = {}) {
	const n = (name || "").trim();
	const s = (surname || "").trim();
	const p = (patronymic || "").trim();
	const nick = (nobleNickname || "").trim();

	const givnCombined = [n, p].filter(Boolean).join(" ");
	const mainLine = `1 NAME ${givnCombined} /${s}/`.trim();

	const lines = [mainLine];
	if (n) lines.push(`2 GIVN ${n}`);
	if (s) lines.push(`2 SURN ${s}`);
	if (p) lines.push(`2 _PATR ${p}`);
	if (nick) lines.push(`2 NICK ${nick}`);

	return lines;
}
