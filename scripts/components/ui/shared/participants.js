// ./scripts/components/ui/shared/participants.js

import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";
import { escapeHtml } from "../../../utils/helpers.js";
import { renderPersonTile } from "./personTile.js";

/**
 * Локалізує роль учасника з урахуванням коротких кодів бази даних (WIT, PRI, GOD_P)
 */
function resolveParticipantRole(rawRole) {
	const roleStr = String(rawRole || "")
		.toLowerCase()
		.trim();
	if (!roleStr) return "";

	// Враховано ваші короткі коди з БД
	if (
		roleStr.includes("pri") ||
		roleStr.includes("свя") ||
		roleStr.includes("отець")
	) {
		return i18n.t("roles.priest") || "Отець";
	}
	if (
		roleStr.includes("god_p") ||
		roleStr.includes("godfather") ||
		roleStr.includes("хрещений")
	) {
		return i18n.t("roles.godfather") || "Хрещений батько";
	}
	if (
		roleStr.includes("god_m") ||
		roleStr.includes("godmother") ||
		roleStr.includes("хрещена")
	) {
		return i18n.t("roles.godmother") || "Хрещена мати";
	}
	if (roleStr.includes("wit") || roleStr.includes("свідок")) {
		return i18n.t("roles.witness") || "Свідок";
	}

	return rawRole.toUpperCase();
}

/**
 * РІВЕНЬ UI: Фільтрує учасників за роллю, прибирає дублікати та генерує сітку HTML.
 */
export function renderParticipantTiles(participants, roleCodes, ctx = null) {
	console.log(
		"DEBUG [UI_PARTICIPANTS]: Вхідний масив учасників ->",
		participants,
	);
	console.log(
		"DEBUG [UI_PARTICIPANTS]: Вхідні коди ролей (roleCodes) ->",
		roleCodes,
	);
	if (!Array.isArray(participants) || participants.length === 0) return "";

	// 🔥 ВИПРАВЛЕНО: Правильна обробка Set, масивів та поодиноких значень
	let safeRoleCodes = [];
	if (roleCodes instanceof Set) {
		safeRoleCodes = Array.from(roleCodes);
	} else if (Array.isArray(roleCodes)) {
		safeRoleCodes = roleCodes;
	} else if (roleCodes) {
		safeRoleCodes = [roleCodes];
	}

	if (safeRoleCodes.length === 0) return "";

	// 1. Фільтруємо по ролі
	const filtered = participants.filter((p) => {
		// 🔥 Додано підтримку 'role_code' та 'roleCode'
		const rawRole = p.role || p.role_code || p.roleCode || "";
		const r = String(rawRole).toLowerCase();

		return safeRoleCodes.some((code) => {
			const safeCode = String(code).toLowerCase();
			return r === safeCode || r.includes(safeCode);
		});
	});

	if (filtered.length === 0) return "";

	// 2. Дедублікація
	const uniqueMap = new Map();
	filtered.forEach((p) => {
		const key =
			!p.id || String(p.id).startsWith("tmp_")
				? `${p.name}_${p.surname}`
				: p.id;

		if (!uniqueMap.has(key)) {
			uniqueMap.set(key, p);
		}
	});

	// 3. Рендер карток
	const htmlString = Array.from(uniqueMap.values())
		.map((p) => {
			const personObj = p._linkedProfile || p;

			const normalizedPerson = {
				...personObj,
				name: personObj.name || p.name || "",
				surname: personObj.surname || p.surname || "",
				patronymic: personObj.patronymic || p.patronymic || "",
				gender: personObj.gender || p.gender || "unknown",
				id: personObj.id || p.id || "",
			};

			const roleLabelRaw = resolveParticipantRole(p.role);
			const roleLabel = escapeHtml(roleLabelRaw);

			return renderPersonTile(normalizedPerson, ctx, roleLabel, false, { showId: true });
		})
		.join("");

	return `
        <div class="${UI_CLASSES.participantList}">
            ${htmlString}
        </div>
    `;
}
