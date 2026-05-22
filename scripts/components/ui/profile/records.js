// ./scripts/components/ui/profile/records.js

import { COLUMNS } from "../../../core/dbSchema.js";
import {
	groupBy,
	escapeHtml,
	convertDriveLink,
} from "../../../utils/helpers.js";
import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";

import {
	resolveTagsHtml,
	resolveArchiveInfoHtml,
	getEventIcon,
	resolveTranscriptionHtml,
} from "../formatters/records.js";

/**
 * Рендерить картку єдиного архівного документа.
 * УВАГА: Очікується, що масив images вже склеєний процесором, якщо документ багатосторінковий.
 */
function renderRecordCard(record, ctx) {
	if (!record) return "";

	const untitledLabel = escapeHtml(i18n.t("common.untitled") || "Без назви");
	const titleRaw = record[COLUMNS.records?.title || "title"] || untitledLabel;
	const yearRaw = record[COLUMNS.records?.year || "year"] || record.year || "";
	const type = String(record[COLUMNS.records?.type || "type"] || "doc")
		.toLowerCase()
		.trim();

	const buildImgUrl = (filename) => {
		if (!filename) return "";
		let cleanName = String(filename).trim();

		if (cleanName.includes("drive.google.com") || cleanName.includes("/")) {
			return typeof convertDriveLink === "function"
				? convertDriveLink(cleanName)
				: cleanName;
		}

		const isMilitary =
			type === "w" || type === "military" || type === "військові";
		const folder = isMilitary ? "military" : "records";
		const ext = cleanName.includes(".") ? "" : ".png";

		return `/assets/imgs/${folder}/${cleanName}${ext}`;
	};

	const imagesKey = COLUMNS.records?.images || "images";
	const rawImagesData = record[imagesKey] || "";

	// Парсинг склеєного рядка зображень
	const imageList = String(rawImagesData)
		.split(/[,;]/)
		.map((img) => img.trim())
		.filter(Boolean);

	const firstCropRaw = imageList.length > 0 ? imageList[0] : "";
	const rawThumbUrl = buildImgUrl(firstCropRaw);
	const thumbUrl = rawThumbUrl ? encodeURI(rawThumbUrl) : "";
	const fullUrls = imageList.map((u) => encodeURI(buildImgUrl(u))).join(";");
	const hasImage = !!thumbUrl;

	const icon = escapeHtml(getEventIcon(type));
	const roleRaw = record._role || "";
	const roleLabel = escapeHtml(i18n.t("common.role") || "Роль");

	let rawArchiveName = "";
	let rawArchiveAddress = "";

	if (record._archive) {
		rawArchiveName = record._archive[COLUMNS.archives?.name || "name"] || "";
		rawArchiveAddress =
			record._archive[COLUMNS.archives?.address || "address"] || "";
	} else {
		rawArchiveName = record.archive_name || record.archive_id || "";
		rawArchiveAddress = record.archive_address || "";
	}

	const rawArchiveRef =
		record[COLUMNS.records?.archiveRef || "archive_ref"] || "";
	const archiveName = escapeHtml(rawArchiveName);
	const archiveRef = escapeHtml(rawArchiveRef);
	const archiveAddress = escapeHtml(rawArchiveAddress);

	const participantsRaw =
		record[COLUMNS.records?.participants || "participants"] || "";
	const tagsHtml = resolveTagsHtml(participantsRaw, ctx);
	const archiveHtml = resolveArchiveInfoHtml(record);

	const title = escapeHtml(titleRaw);
	const year = escapeHtml(yearRaw);
	const role = escapeHtml(roleRaw);

	const roleHtml = role
		? `<div class="record-card-role"><span class="role-label">${roleLabel}:</span> <span class="role-value">${role}</span></div>`
		: "";

	const docIcon = escapeHtml(
		UI_CLASSES.icons?.defaultEvent || "ri-file-text-line",
	);

	const placeholderClass =
		UI_CLASSES.recordCardPlaceholder || "record-card-placeholder";
	const coverContent = hasImage
		? `<img src="${thumbUrl}" alt="${title}" loading="lazy" class="record-card-img" referrerpolicy="no-referrer">`
		: `<div class="${placeholderClass}"><i class="${docIcon}"></i></div>`;

	const badgeClass = UI_CLASSES.recordCardBadge || "record-card-badge";
	const badgeHtml = year
		? `<div class="${badgeClass}"><i class="${icon}"></i> ${year}</div>`
		: "";

	const pagesIcon = UI_CLASSES.icons?.pages || "ri-pages-line";
	const countIndicatorHtml =
		imageList.length > 1
			? `<div class="record-card-pages-count"><i class="${pagesIcon}"></i> 1 / ${imageList.length}</div>`
			: "";

	const zoomIcon = escapeHtml(UI_CLASSES.icons?.zoomIn || "ri-zoom-in-line");

	const rawTranscription =
		record[COLUMNS.records?.transcription || "transcription"];
	const transcriptionHtml = resolveTranscriptionHtml(rawTranscription);
	const rawLink =
		record[COLUMNS.records?.externalLink || "external_link"] || "";
	const safeLink = rawLink ? encodeURI(rawLink) : "";

	const cardClass = UI_CLASSES.recordCard || "record-card";
	const coverClass = UI_CLASSES.recordCardCover || "record-card-cover";
	const overlayClass = UI_CLASSES.recordCardOverlay || "record-card-overlay";
	const contentClass = UI_CLASSES.recordCardContent || "record-card-content";
	const titleClass = UI_CLASSES.recordCardTitle || "record-card-title";
	const hiddenClass = UI_CLASSES.hidden || "hidden";
	const metaDataClass = UI_CLASSES.metaData || "meta-data";
	const metaTransClass = UI_CLASSES.metaTranscription || "meta-transcription";
	const metaLinkClass = UI_CLASSES.metaLink || "meta-link";

	return `
        <div class="${cardClass} js-gallery-item" 
             data-full="${fullUrls}" 
             data-caption="${title} ${year ? `(${year})` : ""}"
             data-group="archival-records"
             data-archive-name="${archiveName}"
             data-archive-ref="${archiveRef}"
             data-archive-address="${archiveAddress}"
             data-participants="${escapeHtml(participantsRaw)}"
             role="button" 
             tabindex="0">
            
            <div class="${coverClass}">
                ${countIndicatorHtml}
                ${coverContent}
                <div class="${overlayClass}"><i class="${zoomIcon}"></i></div>
                ${badgeHtml}
            </div>

            <div class="${contentClass}">
                <div class="${titleClass}">${title}</div>
                ${roleHtml}
                <div class="record-card-meta">
                    ${archiveHtml}
                    ${tagsHtml}
                </div>
            </div>

            <div class="${hiddenClass} ${metaDataClass}">
                <div class="${metaTransClass}">${transcriptionHtml}</div>
                <div class="${metaLinkClass}">${safeLink}</div>
            </div>
        </div>
    `;
}

function renderCategory(categoryName, items, ctx) {
	const defaultCategory = i18n.t("profile.otherDocuments") || "Інші документи";
	const title = escapeHtml(
		categoryName && categoryName !== "undefined"
			? categoryName
			: defaultCategory,
	);

	const itemsHtml = items
		.map((record) => renderRecordCard(record, ctx))
		.join("");

	const dividerClass = UI_CLASSES.blockDivider || "block-divider";
	const subClass =
		UI_CLASSES.blockDividerSubsection || "block-divider--subsection";

	return `
        <div class="records-group">
            <div class="${dividerClass} ${subClass}">
                <span>${title}</span>
            </div>
            <div class="records-grid">
                ${itemsHtml}
            </div>
        </div>
    `;
}

export function renderRecords(person) {
	const records = person?._records;
	if (!Array.isArray(records) || records.length === 0) return "";

	const categoryKey = COLUMNS.records?.category || "category";

	// Групування суто для відображення
	const grouped = groupBy(records, categoryKey);
	const headerLabel = escapeHtml(
		i18n.t("profile.archivalSources") || "Архівні джерела",
	);

	const contentHtml = Object.entries(grouped)
		.map(([category, items]) =>
			renderCategory(category, items, person._context),
		)
		.join("");

	const blockClass = UI_CLASSES.profileBlock || "profile-block";
	const headerClass = UI_CLASSES.profileBlockHeader || "profile-block__header";
	const bodyClass = UI_CLASSES.profileBlockBody || "profile-block__body";

	return `
        <section class="${blockClass}">
            <h2 class="${headerClass}">${headerLabel}</h2>
            <div class="${bodyClass} records-container">
                ${contentHtml}
            </div>
        </section>
    `;
}
