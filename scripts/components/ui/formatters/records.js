// ./scripts/components/ui/formatters/records.js

import { COLUMNS } from "../../../core/dbSchema.js";
import { i18n } from "../../../core/i18n.js";
import { splitString, escapeHtml } from "../../../utils/helpers.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";

/**
 * РІВЕНЬ UI: Формує HTML тегів (учасників)
 * Оптимізовано: санітизація вузлів, безпечний доступ до індексів.
 */
export function resolveTagsHtml(rawString, ctx) {
	const tags = splitString(rawString);
	if (tags.length === 0) return "";

	const titleAction = escapeHtml(
		i18n.t("ui.viewProfile") || "Перейти до профілю",
	);
	const idPrefix = escapeHtml(i18n.t("common.id") || "ID");

	const tagsHtml = tags
		.map((tag) => {
			const strTag = String(tag).trim();
			let displayName = `#${strTag}`;
			let fullName = `${idPrefix}: ${strTag}`;

			let hasProfile = false;

			// Безпечна перевірка ланцюга об'єктів
			if (ctx?.engine?._indexes) {
				const basicRow = ctx.engine._indexes.basic?.get(strTag);
				const famRow = !basicRow
					? ctx.engine._indexes.family?.get(strTag)
					: null;

				if (basicRow || famRow) {
					hasProfile = true;

					const fName = basicRow
						? basicRow[COLUMNS.basic?.name || "name"]
						: famRow[COLUMNS.familyList?.firstName || "firstName"];

					const lName = basicRow
						? basicRow[COLUMNS.basic?.surname || "surname"]
						: famRow[COLUMNS.familyList?.surname || "surname"];

					const pName = basicRow
						? basicRow[COLUMNS.basic?.patronymic || "patronymic"]
						: famRow[COLUMNS.familyList?.patronymic || "patronymic"];

					const full = [lName, fName, pName].filter(Boolean).join(" ");

					if (fName) displayName = fName; // Тег: тільки ім'я
					if (full) fullName = full; // Тултіп: ПІБ
				}
			}

			const safeDisplayName = escapeHtml(displayName);
			const safeFullName = escapeHtml(fullName);
			const safeStrTag = escapeHtml(strTag);

			const isRestrictedId = /^[fp]/i.test(strTag);
			const isClickable = hasProfile && !isRestrictedId;

			const baseClass = UI_CLASSES.recordTag || "record-tag";

			if (isClickable) {
				return `
                <span data-id="${safeStrTag}"
                      class="${baseClass} js-profile-link"
                      role="button"
                      tabindex="0"
                      title="${titleAction}: ${safeFullName}">${safeDisplayName}</span>
                `;
			} else {
				const inactiveClass =
					UI_CLASSES.recordTagInactive || "record-tag--inactive";
				return `
                <span class="${baseClass} ${inactiveClass}"
                      title="${safeFullName}">${safeDisplayName}</span>
                `;
			}
		})
		.join("");

	return `<div class="${UI_CLASSES.recordCardTags || "record-card-tags"}">${tagsHtml}</div>`;
}

/**
 * РІВЕНЬ UI: Формує HTML архіву для картки (ТІЛЬКИ НАЗВА)
 */
export function resolveArchiveInfoHtml(record) {
	let rawArchiveName = "";

	if (record._archive) {
		rawArchiveName = record._archive[COLUMNS.archives?.name || "name"] || "";
	} else {
		rawArchiveName = record.archive_name || record.archive_id || "";
	}

	const safeName = escapeHtml(rawArchiveName);

	if (!safeName) return "";

	const iconClass = UI_CLASSES.icons?.archive || "ri-bank-line";
	return `
        <div class="${UI_CLASSES.recordCardArchive || "record-card-archive"}">
            <i class="${iconClass} ${UI_CLASSES.archiveIcon || "archive-icon"}" aria-hidden="true"></i> 
            <span class="${UI_CLASSES.archiveName || "archive-name"}">${safeName}</span>
        </div>
    `;
}

/**
 * РІВЕНЬ UI: Форматування транскрипцій архівних записів.
 * Оптимізовано: масивна буферизація об'єктів.
 */
export function resolveTranscriptionHtml(rawTranscription) {
	if (!rawTranscription) return "";

	try {
		const parsedData = JSON.parse(rawTranscription);

		let targetObj =
			parsedData && typeof parsedData === "object" && parsedData.desc
				? parsedData.desc
				: parsedData;

		// --- ДИНАМІЧНИЙ ПАРСЕР СПОВІДНИХ ВІДОМОСТЕЙ ---
		if (targetObj && targetObj.heads && Array.isArray(targetObj.persons)) {
			const transformed = [];

			if (targetObj.heads[3]) {
				transformed.push(targetObj.heads[3]);
			}

			if (targetObj.num && targetObj.heads[0]) {
				transformed.push(`${targetObj.heads[0]}|${targetObj.num}`);
			}

			let currentM = parseInt(targetObj.m, 10);
			let currentF = parseInt(targetObj.f, 10);

			targetObj.persons.forEach((personStr) => {
				const parts = personStr.split("|");

				if (parts.length >= 4) {
					const genderRaw = parts[0].trim();
					const name = parts[1].trim();
					const age = parseInt(parts[2].trim(), 10);
					const confessionFlag = parts[3].trim();

					const isMale = genderRaw === "m" || genderRaw === "м";
					const isFemale = genderRaw === "f" || genderRaw === "ж";

					let seqNumStr = "";
					if (isMale && !isNaN(currentM)) {
						seqNumStr = `№${currentM}`;
						currentM++;
					} else if (isFemale && !isNaN(currentF)) {
						seqNumStr = `№${currentF}`;
						currentF++;
					}

					const genderFormatted = isMale
						? "чол."
						: isFemale
							? "жін."
							: genderRaw;

					let ageStr = `${age} л.`;
					if (age % 10 === 1 && age % 100 !== 11) {
						ageStr = `${age} г.`;
					} else if (
						[2, 3, 4].includes(age % 10) &&
						![12, 13, 14].includes(age % 100)
					) {
						ageStr = `${age} г.`;
					}

					const confStatus =
						confessionFlag === "1"
							? isMale
								? "був на сповіді"
								: "була на сповіді"
							: isMale
								? "не був на сповіді"
								: "не була на сповіді";

					const valParts = [];
					if (genderFormatted) valParts.push(genderFormatted);
					if (!isNaN(age)) valParts.push(ageStr);
					if (confessionFlag) valParts.push(confStatus);

					if (seqNumStr) {
						transformed.push(`${seqNumStr}||${name}: ${valParts.join(", ")}`);
					} else {
						transformed.push(`${name}|${valParts.join(", ")}`);
					}
				} else {
					transformed.push(personStr);
				}
			});

			targetObj = transformed;
		}
		// --- ДИНАМІЧНИЙ ПАРСЕР РЕВІЗЬКИХ КАЗОК ---
		else if (targetObj && targetObj.heads && Array.isArray(targetObj.all)) {
			const transformed = [];

			if (targetObj.num && targetObj.heads[0]) {
				transformed.push(`${targetObj.heads[0]}|${targetObj.num}`);
			}
			if (targetObj.heads[1]) {
				transformed.push(targetObj.heads[1]);
			}

			const formatAge = (val) => {
				if (!val || val === "-") return null;
				return /^\d+$/.test(val) ? `${val} р.` : val;
			};

			targetObj.all.forEach((personStr) => {
				const parts = personStr.split("|");

				if (parts.length >= 5) {
					const genderRaw = parts[0].trim();
					const name = parts[1].trim();
					const agePrev = formatAge(parts[2].trim());
					const status = parts[3].trim();
					const ageNow = formatAge(parts[4].trim());

					const isMale = genderRaw === "m" || genderRaw === "м";
					const isFemale = genderRaw === "f" || genderRaw === "ж";
					const genderFormatted = isMale
						? "чол."
						: isFemale
							? "жін."
							: genderRaw;

					const valParts = [];
					if (genderFormatted) valParts.push(genderFormatted);

					if (agePrev) valParts.push(`поперед. ревізія: ${agePrev}`);
					if (status && status !== "-") valParts.push(status);
					if (ageNow) valParts.push(`нині: ${ageNow}`);

					transformed.push(`||${name}: ${valParts.join(", ")}`);
				} else {
					transformed.push(personStr);
				}
			});

			targetObj = transformed;
		}

		const processNode = (node) => {
			if (typeof node === "string") {
				if (node.includes("||")) {
					const parts = node.split("||");
					const key = escapeHtml(parts[0].trim());
					const val = escapeHtml(parts.slice(1).join("||").trim()) || "—";
					return `<div class="${UI_CLASSES.docTranscriptionRow || "doc-transcription-row"}"><span class="${UI_CLASSES.docTranscriptionKey || "doc-transcription-key"}">${key}</span> <span class="${UI_CLASSES.docTranscriptionVal || "doc-transcription-val"}">${val}</span></div>`;
				} else if (node.includes("|")) {
					const parts = node.split("|");
					const key = escapeHtml(parts[0].trim());
					const val = escapeHtml(parts.slice(1).join("|").trim()) || "—";
					return `<div class="${UI_CLASSES.docTranscriptionRow || "doc-transcription-row"}"><span class="${UI_CLASSES.docTranscriptionKey || "doc-transcription-key"}">${key}:</span> <span class="${UI_CLASSES.docTranscriptionVal || "doc-transcription-val"}">${val}</span></div>`;
				}
				return `<div class="${UI_CLASSES.docTranscriptionHeader || "doc-transcription-header"}">${escapeHtml(node.trim())}</div>`;
			}

			if (Array.isArray(node)) {
				const items = node.map(processNode).join("");
				return `<div class="${UI_CLASSES.docTranscriptionGroup || "doc-transcription-group"}">${items}</div>`;
			}

			if (node && typeof node === "object") {
				const rowsBuffer = [];
				for (const [key, data] of Object.entries(node)) {
					if (!Array.isArray(data) || data.length < 2) continue;

					const labelText = escapeHtml(data[0] || "");
					const valueText = escapeHtml(data[1] || "");

					if (!labelText && !valueText) continue;

					rowsBuffer.push(`
                        <div class="${UI_CLASSES.docTranscriptionRow || "doc-transcription-row"}">
                            <span class="${UI_CLASSES.docTranscriptionKey || "doc-transcription-key"}">${labelText}:</span>
                            <span class="${UI_CLASSES.docTranscriptionVal || "doc-transcription-val"}">${valueText}</span>
                        </div>
                    `);
				}
				if (rowsBuffer.length > 0) {
					return `<div class="${UI_CLASSES.docTranscriptionGroup || "doc-transcription-group"}">${rowsBuffer.join("")}</div>`;
				}
			}

			return "";
		};

		const resultHtml = processNode(targetObj);

		if (resultHtml) {
			return `<div class="${UI_CLASSES.docTranscription || "doc-transcription"}">${resultHtml}</div>`;
		}
	} catch (e) {
		// Деградація до сирого тексту у разі невалідного JSON
	}

	return escapeHtml(String(rawTranscription));
}

/**
 * РІВЕНЬ UI: Отримання іконки для події за її типом
 */
export function getEventIcon(type) {
	const t = (type || "").toLowerCase().trim();
	const icons = UI_CLASSES.icons || {};
	const map = {
		b: icons.birth,
		birth: icons.birth,
		народження: icons.birth,
		c: icons.christening,
		christening: icons.christening,
		хрещення: icons.christening,
		m: icons.marriage,
		marriage: icons.marriage,
		шлюб: icons.marriage,
		d: icons.death,
		death: icons.death,
		смерть: icons.death,
		f: icons.funeral,
		funeral: icons.funeral,
		поховання: icons.funeral,
		w: icons.military || "ri-sword-line",
		military: icons.military || "ri-sword-line",
		військові: icons.military || "ri-sword-line",
		a: icons.medalLine || "ri-medal-line",
		award: icons.medalLine || "ri-medal-line",
		нагорода: icons.medalLine || "ri-medal-line",
		нагороди: icons.medalLine || "ri-medal-line",
	};
	return map[t] || icons.defaultEvent || "ri-file-text-line";
}
