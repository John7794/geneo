// ./scripts/components/ui/formatters/name.js

import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";
import { normalizeGender } from "../../../utils/genderUtils.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * РІВЕНЬ UI: Формує HTML імені для плитки персони (Molecule)
 * Оптимізовано: санітизація вузлів, буферизація, фолбеки класів.
 * @param {Object} person - Об'єкт персони
 * @param {Object} options - Налаштування відображення
 * @returns {string} HTML рядок
 */
export function formatPersonNameHtml(person) {
	const unknownLabelRaw = i18n.t("common.unknown") || "Невідомо";
	const unknownLabel = escapeHtml(unknownLabelRaw);

	if (!person || (!person.name && !person.surname)) return unknownLabel;

	const nameRaw = String(person.name || "").trim();
	let surnameRaw = String(person.surname || "")
		.trim()
		.toUpperCase();

	// 🔥 ВИМОГА 2: Дівоче прізвище виводимо ТІЛЬКИ для жінок
	const isFem = normalizeGender(person.gender) === "f";
	if (isFem && person.maidenName) {
		const cleanMaiden = String(person.maidenName).trim().toUpperCase();
		if (cleanMaiden && surnameRaw && cleanMaiden !== surnameRaw) {
			surnameRaw = `${surnameRaw} (${cleanMaiden})`;
		} else if (cleanMaiden) {
			surnameRaw = cleanMaiden;
		}
	}

	const name = escapeHtml(nameRaw);
	const surname = escapeHtml(surnameRaw);

	const htmlBuffer = [];

	// Ім'я
	if (name) {
		const firstClass =
			UI_CLASSES.kinshipCardNameFirst || "kinship-card-name-first";
		htmlBuffer.push(`<span class="${firstClass}">${name}</span>`);
	}

	// Прізвище
	if (surname) {
		const surnameClass =
			UI_CLASSES.kinshipCardNameSurname || "kinship-card-name-surname";
		htmlBuffer.push(`<span class="${surnameClass}">${surname}</span>`);
	}

	return htmlBuffer.length > 0 ? htmlBuffer.join(" ") : unknownLabel;
}

/**
 * РІВЕНЬ UI: Генерує ім'я в родовому відмінку з розбиттям по рядках
 * @param {Object|string} item - Об'єкт родича з ланцюжка або просто рядок
 * @returns {string} Екранований HTML рядок з переносами
 */
export function getFormattedGenitiveNameHtml(item) {
	if (!item) return "";

	// Якщо передано рядок — екрануємо, розбиваємо і зшиваємо безпечним <br>
	if (typeof item === "string") {
		return item
			.split(" ")
			.filter(Boolean)
			.map((part) => escapeHtml(part))
			.join("<br>");
	}

	const personId = item.personId || item.id;
	const locKey = `genitiveNames.${personId}`;

	let fullName = "";
	const translated = i18n.t(locKey);

	if (translated && translated !== locKey) {
		// Переклад знайдено (вже містить "Івана Сергійовича")
		fullName = translated;
	} else {
		// Фолбек: якщо перекладу немає, беремо звичайні ім'я та по батькові
		const name = String(item.personName || item.name || "").trim();
		const patronymic = String(
			item.personPatronymic || item.patronymic || "",
		).trim();
		fullName = `${name} ${patronymic}`.trim();
	}

	// Безпечне розбиття та зшивання
	return fullName
		.split(" ")
		.filter(Boolean)
		.map((part) => escapeHtml(part))
		.join("<br>");
}
