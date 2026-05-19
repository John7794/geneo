// ./scripts/utils/genderUtils.js

import { i18n } from "../core/i18n.js";
import {
	GENDER_MARKERS,
	CHILD_ROLES,
	PARENT_ROLES,
} from "../core/appConfig.js";

// Мікрокеш для усунення надлишкових рядкових операцій під час масового рендерингу
const _genderCache = new Map();

// ==========================================
// БІЗНЕС-ЛОГІКА
// ==========================================

/**
 * Отримання нормалізованого коду статі (тринарна логіка: f, m, u)
 * Впроваджено мемоізацію (Memoization) для мінімізації навантаження на Garbage Collector.
 */
export function getGenderCode(rawGender) {
	if (rawGender === null || rawGender === undefined) return "u";

	// Пошук в O(1) без алокації нових рядків
	if (_genderCache.has(rawGender)) {
		return _genderCache.get(rawGender);
	}

	const clean = String(rawGender).trim().toLowerCase();
	let code = "u";

	if (GENDER_MARKERS.female.has(clean)) {
		code = "f";
	} else if (GENDER_MARKERS.male.has(clean)) {
		code = "m";
	}

	// Збереження результату для ідентичних вхідних даних
	_genderCache.set(rawGender, code);
	return code;
}

/**
 * Перевірка на приналежність до жіночої статі (O(1))
 */
export function isFemale(rawGender) {
	return getGenderCode(rawGender) === "f";
}

/**
 * Перевірка на приналежність до чоловічої статі (O(1))
 */
export function isMale(rawGender) {
	return getGenderCode(rawGender) === "m";
}

/**
 * Експортований нормалізатор для процесорів
 */
export function normalizeGender(rawGender) {
	return getGenderCode(rawGender);
}

/**
 * Ролі для дітей з урахуванням стану невизначеності
 */
export function resolveChildRole(category, gender) {
	const code = getGenderCode(gender);
	const match = CHILD_ROLES[category]?.[code];
	return match ? i18n.t(match.key) || match.fallback : "";
}

/**
 * Ролі для батьків з урахуванням стану невизначеності
 */
export function resolveParentRole(type, gender) {
	const code = getGenderCode(gender);
	const match = PARENT_ROLES[type]?.[code];
	return match ? i18n.t(match.key) || match.fallback : "";
}

/**
 * Динамічний пошук перекладу специфічної ролі.
 * Усунено жорстку перевірку typeof для підтримки числових ідентифікаторів з БД.
 */
function _getDynamicRoleTranslation(rawRole) {
	if (rawRole === null || rawRole === undefined) return null;

	const safeString = String(rawRole).trim();
	if (safeString === "") return null;

	const key = `roles.${safeString}`;
	const translated = i18n.t(key);

	if (translated && translated !== key) {
		return translated;
	}

	return null;
}

/**
 * Визначення ролі сиблінга
 */
export function resolveSiblingRole(person, roleKey) {
	const dynamicRole = _getDynamicRoleTranslation(roleKey);
	if (dynamicRole) return dynamicRole;

	const code = getGenderCode(person?.gender);
	if (code === "f") return i18n.t("roles.sister") || "Сестра";
	if (code === "m") return i18n.t("roles.brother") || "Брат";

	return i18n.t("roles.sibling") || "Брат / Сестра";
}

/**
 * Визначення ролі онука/онуки
 */
export function resolveGrandChildRole(person, roleKey) {
	const dynamicRole = _getDynamicRoleTranslation(roleKey);
	if (dynamicRole) return dynamicRole;

	const code = getGenderCode(person?.gender);
	if (code === "f") return i18n.t("roles.grandDaughter") || "Онука";
	if (code === "m") return i18n.t("roles.grandSon") || "Онук";

	return i18n.t("roles.grandChild") || "Онук / Онука";
}

/**
 * Визначення підпису загальної спорідненості
 */
export function resolveRoleLabel(person, itemRole) {
	const dynamicRole = _getDynamicRoleTranslation(itemRole);
	if (dynamicRole) return dynamicRole;

	const code = getGenderCode(person?.gender);
	if (code === "f") return i18n.t("roles.relativeFemale") || "Родичка";
	if (code === "m") return i18n.t("roles.relativeMale") || "Родич";

	return i18n.t("roles.relative") || "Родич / Родичка";
}

/**
 * Визначає локалізовану роль для духовного споріднення на основі статі.
 * @param {Object} person Об'єкт персони
 * @param {string} defaultRoleKey Базовий ключ (godchild, cogodparent)
 */
export function resolveSpiritualRole(person, defaultRoleKey) {
	if (!defaultRoleKey) return "";

	const code = getGenderCode(person?.gender);

	if (code === "f") {
		const femKey = `roles.${defaultRoleKey}Female`;
		const femRole = i18n.t(femKey);
		if (femRole && femRole !== femKey) return femRole;
	}

	if (code === "m") {
		const maleKey = `roles.${defaultRoleKey}Male`;
		const maleRole = i18n.t(maleKey);
		if (maleRole && maleRole !== maleKey) return maleRole;
	}

	const fallbackKey = `roles.${defaultRoleKey}`;
	const fallbackRole = i18n.t(fallbackKey);

	return fallbackRole && fallbackRole !== fallbackKey
		? fallbackRole
		: defaultRoleKey;
}
