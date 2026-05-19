// ./scripts/components/ui/profile/names.js

import { COLUMNS } from "../../../core/dbSchema.js";
import { i18n } from "../../../core/i18n.js";
import { splitString, escapeHtml } from "../../../utils/helpers.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";

// UI Форматери
import { formatCoatHtml } from "../formatters/coat.js";
import { resolveCoatUrl } from "../../../utils/coatUtils.js";

/**
 * Блокує додавання класу data-row__value для збереження елементів в один рядок.
 * Оптимізовано: пряме звернення до словника.
 */
function makeInlineRow(label, value) {
	return `
    <div class="${UI_CLASSES.dataRow}">
        <div class="${UI_CLASSES.dataRowKey}">${label}</div>
        <div>${value}</div>
    </div>`;
}

/**
 * Генерує стандартизовану структуру плашки (тегу) для текстових даних.
 */
function renderTag(rawString, allowSplit = false) {
	if (!rawString) return "";
	const str = String(rawString).trim();
	if (!str) return "";

	let items = [str];
	if (allowSplit) {
		items = str
			.split(/[;,]+/)
			.map((s) => s.trim())
			.filter(Boolean);
	}

	const tagsHtml = items
		.map((item) => `<span class="profile-name-tag">${escapeHtml(item)}</span>`)
		.join("");

	return `<div class="profile-tags-wrapper">${tagsHtml}</div>`;
}

/**
 * Обгортає готовий HTML (герб) у структуру плашки з підтримкою галереї.
 * Додано класи та data-атрибути для активації Lightbox.
 */
function wrapHtmlInTag(htmlContent, coatUrl = null) {
	if (!htmlContent) return "";

	// Додаємо класи для галереї (наприклад, UI_CLASSES.jsGalleryItem або lightbox-trigger)
	const galleryClass = UI_CLASSES.jsGalleryItem || "js-gallery-item";

	// Якщо coatUrl передано, додаємо його як джерело для повнорозмірного фото
	const dataAttr = coatUrl
		? `data-src="${escapeHtml(coatUrl)}" data-gallery="profile-coats"`
		: "";

	return `
    <div class="profile-tags-wrapper">
        <span class="profile-name-tag clickable-coat" ${dataAttr} role="button" aria-label="Відкрити герб">
            ${htmlContent}
        </span>
    </div>`;
}

/**
 * Рендерить рядки для шлюбних прізвищ.
 */
function renderMarriageSurnames(data, mCount, ctx) {
	const htmlBuffer = [];

	for (let i = 0; i < mCount; i++) {
		const sNameRaw = data.surnames[i] || "";
		const sNickRaw = data.nicknames[i];
		const sOriginRaw = data.origins[i];
		const sCoatName = data.coats[i];

		if (!sNameRaw && !sNickRaw && !sCoatName) continue;

		const sName = sNameRaw ? renderTag(sNameRaw) : "";
		const sNick = sNickRaw ? renderTag(sNickRaw, true) : "";
		const sOrigin = sOriginRaw ? renderTag(sOriginRaw) : "";

		const valBuffer = [];
		if (sName) valBuffer.push(sName);
		if (sNick) valBuffer.push(sNick);

		if (sOrigin) {
			const fromLabel = escapeHtml(i18n.t("common.from") || "з");
			valBuffer.push(
				`<span class="${UI_CLASSES.dataRowMeta}">${fromLabel}</span> ${sOrigin}`,
			);
		}

		if (sCoatName) {
			const coatUrl = resolveCoatUrl(sCoatName, ctx);
			const sCoatHtml = formatCoatHtml(sCoatName, coatUrl);
			if (sCoatHtml) {
				const coatOfLabel = escapeHtml(i18n.t("profile.coatOf") || "гербу");
				valBuffer.push(
					`<span class="${UI_CLASSES.textMuted}">${coatOfLabel}</span> ${wrapHtmlInTag(sCoatHtml, coatUrl)}`,
				);
			}
		}

		let labelRaw = i18n.t("kinship.inMarriage") || "У шлюбі";
		if (mCount > 1) {
			const ordinalsM = i18n.t("time.ordinalsm");
			const ordArray = Array.isArray(ordinalsM) ? ordinalsM : [];
			const ordinalWord = escapeHtml(ordArray[i] || `${i + 1}-й`);

			const marriageLabel = escapeHtml(i18n.t("events.marriage") || "Шлюб");
			labelRaw = `${ordinalWord} ${String(marriageLabel).toLowerCase()}`;
		}

		const label = escapeHtml(labelRaw);
		const valHtml = valBuffer.join(" ");
		htmlBuffer.push(makeInlineRow(label, valHtml));
	}
	return htmlBuffer.join("");
}

export function renderNamesBlock(person) {
	const n = person?._names;
	if (!n) return "";

	const R = COLUMNS.names;
	const ctx = person._context;

	// 1. ПІДГОТОВКА ДАНИХ
	const titleValRaw = n[R.title];
	const baptismRaw = n[R.baptismName];
	const altFirstRaw = n[R.altFirstNames];
	const patronymicRaw = n[R.deJurePatronymic];

	const marriageData = {
		surnames: splitString(n[R.mSurname]),
		nicknames: splitString(n[R.mNobleNicknames]),
		origins: splitString(n[R.mOriginPlace]),
		coats: splitString(n[R.mCoat]),
	};

	const mCount = Math.max(
		marriageData.surnames.length,
		marriageData.nicknames.length,
		marriageData.origins.length,
		marriageData.coats.length,
	);

	const hasNames = [baptismRaw, altFirstRaw, patronymicRaw].some((v) =>
		v?.trim(),
	);

	const hasSurnames =
		[
			n[R.bSurname],
			n[R.altSurnames],
			n[R.bNobleNicknames],
			n[R.bOriginPlace],
			n[R.bCoat],
			n[R.serviceSurname],
		].some((v) => v?.trim()) || mCount > 0;

	if (!titleValRaw && !hasNames && !hasSurnames) return "";

	// 2. ЗБІРКА HTML
	const contentBuffer = [];

	if (titleValRaw) {
		const titlesLabel = escapeHtml(i18n.t("profile.titles") || "Титули");
		const titleLabel = escapeHtml(i18n.t("profile.title") || "Титул");
		contentBuffer.push(
			`<div class="${UI_CLASSES.blockDivider}"><span>${titlesLabel}</span></div>`,
		);
		contentBuffer.push(makeInlineRow(titleLabel, renderTag(titleValRaw, true)));
	}

	if (hasNames) {
		const namesLabel = escapeHtml(i18n.t("profile.names") || "Імена");
		contentBuffer.push(
			`<div class="${UI_CLASSES.blockDivider}"><span>${namesLabel}</span></div>`,
		);

		if (baptismRaw) {
			const bapLabel = escapeHtml(
				i18n.t("profile.baptismName") || "Хрестильне ім'я",
			);
			contentBuffer.push(makeInlineRow(bapLabel, renderTag(baptismRaw)));
		}
		if (altFirstRaw) {
			const altLabel = escapeHtml(
				i18n.t("profile.altNames") || "Варіанти імен",
			);
			contentBuffer.push(makeInlineRow(altLabel, renderTag(altFirstRaw, true)));
		}
		if (patronymicRaw) {
			const patLabel = escapeHtml(
				i18n.t("profile.patronymic") || "По батькові (юрид.)",
			);
			contentBuffer.push(makeInlineRow(patLabel, renderTag(patronymicRaw)));
		}
	}

	if (hasSurnames) {
		const surnamesLabel = escapeHtml(i18n.t("profile.surnames") || "Прізвища");
		contentBuffer.push(
			`<div class="${UI_CLASSES.blockDivider}"><span>${surnamesLabel}</span></div>`,
		);

		if (n[R.bSurname]) {
			const atBirthLabel = escapeHtml(
				i18n.t("profile.atBirth") || "При народженні",
			);
			contentBuffer.push(makeInlineRow(atBirthLabel, renderTag(n[R.bSurname])));
		}

		if (n[R.bNobleNicknames]) {
			const nicksLabel = escapeHtml(i18n.t("profile.nicknames") || "Придомки");
			contentBuffer.push(
				makeInlineRow(nicksLabel, renderTag(n[R.bNobleNicknames], true)),
			);
		}
		if (n[R.bOriginPlace]) {
			const originLabel = escapeHtml(
				i18n.t("profile.originPlace") || "Родове гніздо",
			);
			contentBuffer.push(
				makeInlineRow(originLabel, renderTag(n[R.bOriginPlace])),
			);
		}

		if (n[R.bCoat]) {
			const coatUrl = resolveCoatUrl(n[R.bCoat], ctx);
			const bCoatHtml = formatCoatHtml(n[R.bCoat], coatUrl);
			if (bCoatHtml) {
				const coatLabel = escapeHtml(i18n.t("profile.coat") || "Герб роду");
				// Передаємо URL для галереї
				contentBuffer.push(
					makeInlineRow(coatLabel, wrapHtmlInTag(bCoatHtml, coatUrl)),
				);
			}
		}

		if (n[R.serviceSurname]) {
			const serviceLabel = escapeHtml(
				i18n.t("profile.serviceName") || "За службою/псевдо",
			);
			contentBuffer.push(
				makeInlineRow(serviceLabel, renderTag(n[R.serviceSurname], true)),
			);
		}
		if (n[R.altSurnames]) {
			const spellingLabel = escapeHtml(
				i18n.t("profile.spelling") || "Варіанти написання",
			);
			contentBuffer.push(
				makeInlineRow(spellingLabel, renderTag(n[R.altSurnames], true)),
			);
		}

		contentBuffer.push(renderMarriageSurnames(marriageData, mCount, ctx));
	}

	const headerLabel = escapeHtml(
		i18n.t("profile.titlesAndNames") || "Титули та імена",
	);

	return `
    <section class="${UI_CLASSES.profileBlock}">
        <h2 class="${UI_CLASSES.profileBlockHeader}">${headerLabel}</h2>
        <div class="${UI_CLASSES.profileBlockBody}">${contentBuffer.join("")}</div>
    </section>
    `;
}
