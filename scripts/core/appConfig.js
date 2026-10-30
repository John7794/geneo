// ./scripts/core/appConfig.js
import { freezeSet } from "../utils/helpers.js";

/**
 * БАЗОВІ НАЛАШТУВАННЯ ДОДАТКУ (APP_CONFIG)
 * Шляхи до медіафайлів, кореневий ID та інші глобальні параметри.
 * Об'єкт заморожено для запобігання мутаціям під час виконання.
 */
export const APP_CONFIG = Object.freeze({
	photoBasePath: "/assets/imgs/portraits/",
	defaultMale: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%20width%3D%2264%22%20height%3D%2264%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2232%22%20fill%3D%22%232563eb%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2254%25%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%20fill%3D%22%23ffffff%22%20font-family%3D%22-apple-system%2C%20BlinkMacSystemFont%2C%20sans-serif%22%20font-size%3D%2224%22%20font-weight%3D%22700%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E",
	defaultFemale: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%20width%3D%2264%22%20height%3D%2264%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2232%22%20fill%3D%22%23e11d48%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2254%25%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%20fill%3D%22%23ffffff%22%20font-family%3D%22-apple-system%2C%20BlinkMacSystemFont%2C%20sans-serif%22%20font-size%3D%2224%22%20font-weight%3D%22700%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E",
	coatBasePath: "/assets/icons/coats/",
	coatExtension: ".svg",
	rootId: "1",
	flagsBasePath: "/assets/icons/flags/",
	flagsExtension: ".svg",
});

/**
 * ГРУПИ РОЛЕЙ (EVENT ROLES)
 * Використовується для класифікації учасників подій (хрещення, вінчання тощо).
 * Застосовано кастомне заморожування Set-структур. Оптимізація пошуку O(1) збережена.
 */
export const EVENT_ROLES = Object.freeze({
	priests: freezeSet([
		"pri",
		"priest",
		"admin",
		"father",
		"pop",
		"svyash",
		"отець",
		"священик",
		"настоятель",
		"парох",
	]),
	godparents: freezeSet([
		"god",
		"god_p",
		"god_m",
		"godfather",
		"godmother",
		"kum",
		"хресний",
		"хресна",
		"воспреемник",
	]),
	witnesses: freezeSet(["wit", "witness", "свідок", "свідки", "поручитель"]),
	bride: freezeSet(["bride", "наречена", "невеста"]),
	groom: freezeSet(["groom", "наречений", "жених"]),
});

/**
 * РЕЄСТР ГЕРБІВ (COATS_MAP)
 * Статичний мапінг назв гербів на ідентифікатори файлів.
 * Ізоляція від логіки парсингу.
 */
export const COATS_MAP = Object.freeze({
	гриф: "gryf",
	гржимала: "grzymala",
	леліва: "leliwa",
	лебідь: "labedz",
	могила: "mogila",
	несобя: "niesobia",
	новина: "nowina",
	остоя: "ostoja",
	сас: "sas",
	шренява: "szreniawa",
	тарнава: "tarnawa",
	топор: "topor",
});

/**
 * МАРКЕРИ СТАТІ (GENDER_MARKERS)
 * Ідентифікатори для розпізнавання статевої приналежності у сирих даних.
 * Структури Set гарантують асимптотичну складність пошуку O(1).
 */
export const GENDER_MARKERS = Object.freeze({
	female: freezeSet(["f", "female", "ж", "жіноча", "w", "woman"]),
	male: freezeSet(["m", "male", "ч", "чоловіча", "чол", "man"]),
});

export const PATHS = Object.freeze({
	portraits: "/assets/imgs/portraits/",
	iconMale: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%20width%3D%2264%22%20height%3D%2264%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2232%22%20fill%3D%22%232563eb%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2254%25%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%20fill%3D%22%23ffffff%22%20font-family%3D%22-apple-system%2C%20BlinkMacSystemFont%2C%20sans-serif%22%20font-size%3D%2224%22%20font-weight%3D%22700%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E",
	iconFemale: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%20width%3D%2264%22%20height%3D%2264%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2232%22%20fill%3D%22%23e11d48%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2254%25%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%20fill%3D%22%23ffffff%22%20font-family%3D%22-apple-system%2C%20BlinkMacSystemFont%2C%20sans-serif%22%20font-size%3D%2224%22%20font-weight%3D%22700%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E",
});

export const CHILD_ROLES = {
	bio: {
		f: { key: "roles.daughter", fallback: "Донька" },
		m: { key: "roles.son", fallback: "Син" },
		u: { key: "roles.child", fallback: "Дитина" },
	},

	step: {
		f: { key: "roles.stepDaughter", fallback: "Пасербиця" },
		m: { key: "roles.stepSon", fallback: "Пасинок" },
		u: { key: "roles.stepChild", fallback: "Зведена дитина" },
	},

	adopted: {
		f: { key: "roles.adoptedDaughter", fallback: "Названа донька" },
		m: { key: "roles.adoptedSon", fallback: "Названий син" },
		u: { key: "roles.adoptedChild", fallback: "Названа дитина" },
	},
};

export const PARENT_ROLES = Object.freeze({
	bio: {
		f: { key: "roles.mother", fallback: "Мати" },
		m: { key: "roles.father", fallback: "Батько" },
		u: { key: "roles.parent", fallback: "Один із батьків" },
	},

	step: {
		f: { key: "roles.stepMother", fallback: "Мачуха" },
		m: { key: "roles.stepFather", fallback: "Вітчим" },
		u: { key: "roles.stepParent", fallback: "Вітчим / Мачуха" },
	},

	adopted: {
		f: { key: "roles.adoptedMother", fallback: "Названа мати" },
		m: { key: "roles.adoptedFather", fallback: "Названий батько" },
		u: { key: "roles.adoptedParent", fallback: "Названі батьки" },
	},
});

export const HTML_ENTITIES = Object.freeze({
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#039;",
	"`": "&#x60;",
});
