// ./scripts/components/ui/formatters/gallery.js

import { UI_CLASSES } from "../../../core/uiClasses.js";
import { convertDriveLink, escapeHtml } from "../../../utils/helpers.js";

/**
 * Мікро-утиліта для групування масиву фотографій за назвою альбому.
 */
function groupByAlbum(galleryArray) {
	return galleryArray.reduce((acc, item) => {
		const albumName =
			item.album && item.album.trim() !== "" ? item.album : "default";
		if (!acc[albumName]) acc[albumName] = [];
		acc[albumName].push(item);
		return acc;
	}, {});
}

/**
 * РІВЕНЬ UI: Форматер візуальної галереї профілю.
 * Розбиває фотографії на альбоми і будує CSS Grid.
 * Оптимізовано через буферизацію масивами та додаткове екранування URL.
 * @param {Array} galleryList - Масив об'єктів _gallery
 * @returns {string} HTML-розмітка
 */
export function buildGalleryHtml(galleryList) {
	if (!galleryList || !Array.isArray(galleryList) || galleryList.length === 0) {
		return "";
	}

	const groupedAlbums = groupByAlbum(galleryList);
	const htmlBuffer = [];
	htmlBuffer.push(
		`<div class="${UI_CLASSES.photoAlbumContainer || "photo-album-container"}">`,
	);

	for (const [albumRaw, photos] of Object.entries(groupedAlbums)) {
		if (!photos || photos.length === 0) continue;

		htmlBuffer.push(`<div class="gallery-album-section">`);

		// Заміна локального заголовка на глобальний компонент розділювача
		if (albumRaw !== "default") {
			const safeAlbum = escapeHtml(albumRaw);
			htmlBuffer.push(`
                <div class="${UI_CLASSES.blockDivider || "block-divider"} ${UI_CLASSES.blockDividerSubsection || "block-divider--subsection"}">
                    <span>${safeAlbum}</span>
                </div>
            `);
		}

		htmlBuffer.push(
			`<div class="${UI_CLASSES.photoAlbumGrid || "photo-album-grid"}">`,
		);

		photos.forEach((photo) => {
			if (!photo.src) return;

			const directImgSrcRaw = convertDriveLink(photo.src);
			const directImgSrc = encodeURI(directImgSrcRaw); // Додаткова санітизація URL
			const safeCaption = escapeHtml(photo.subtitle || "");
			const zoomIcon = UI_CLASSES.icons?.zoomIn || "ri-zoom-in-line";

			const safeGroup = escapeHtml(
				albumRaw === "default"
					? "profile-general"
					: `album-${albumRaw.replace(/\s+/g, "-")}`,
			);

			htmlBuffer.push(`
                <div class="${UI_CLASSES.photoCard || "photo-card"} js-gallery-item" 
                     data-full="${directImgSrc}" 
                     data-caption="${safeCaption}" 
                     data-group="${safeGroup}" 
                     role="button" 
                     tabindex="0"
                     title="Розгорнути фото">
                    
                    <div class="${UI_CLASSES.photoCardImgWrapper || "photo-card-img-wrapper"}">
                        <img src="${directImgSrc}" 
                             alt="${safeCaption || "Фотографічний знімок"}" 
                             loading="lazy" 
                             class="${UI_CLASSES.photoCardImg || "photo-card-img"}"
                             onerror="this.parentElement.innerHTML='<div class=\\'img-error\\'>Помилка доступу</div>'">
                        <div class="${UI_CLASSES.awardTileOverlay || "award-tile-overlay"}"><i class="${zoomIcon}"></i></div>
                    </div>
                    
                    ${safeCaption ? `<div class="${UI_CLASSES.photoCardCaption || "photo-card-caption"}">${safeCaption}</div>` : ""}
                </div>
            `);
		});

		htmlBuffer.push(`</div></div>`);
	}

	htmlBuffer.push(`</div>`);
	return htmlBuffer.join("");
}
