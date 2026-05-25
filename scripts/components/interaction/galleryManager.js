// ./scripts/components/interaction/galleryManager.js

import { i18n } from "../../core/i18n.js";
import { UI_CLASSES } from "../../core/uiClasses.js";
import { escapeHtml } from "../../utils/helpers.js";

export class GalleryManager {
	constructor() {
		this.currentIndex = 0;
		this.galleryItems = [];

		this.scale = 1;
		this.isDragging = false;
		this.wasDragged = false;
		this.startX = 0;
		this.startY = 0;
		this.translateX = 0;
		this.translateY = 0;

		this.isPanelResizing = false;
		this.lastPanelHeight = null;
		this.triggerElement = null;

		this.ticking = false;

		// Жорстка фіксація контексту для усунення витоків пам'яті
		this.handlePointerMove = this.handlePointerMove.bind(this);
		this.handlePointerUp = this.handlePointerUp.bind(this);
		this.handleGlobalClick = this.handleImageClick.bind(this);
		this.handleKeyDown = this.handleKeyDown.bind(this);
		this.handleWheel = this.handleWheel.bind(this);
		this.handleDragStart = this.handleDragStart.bind(this);
		this.handleDragMove = this.handleDragMove.bind(this);
		this.handleDragEnd = this.handleDragEnd.bind(this);
		this.handleTouchStart = this.handleTouchStart.bind(this);
		this.handleTouchMove = this.handleTouchMove.bind(this);
		this.handleTouchEnd = this.handleTouchEnd.bind(this);
		this.handlePanelToggle = this.handlePanelToggle.bind(this);
		this.next = this.next.bind(this);
		this.prev = this.prev.bind(this);
		this.closeGallery = this.closeGallery.bind(this);
		this.handleOverlayClick = this.handleOverlayClick.bind(this);

		this.init();
	}

	init() {
		if (document.getElementById("gallery-overlay")) {
			this.cacheDOM();
			return;
		}

		const showDetailsText = escapeHtml(
			i18n.t("ui.showDetails") || "Показати деталі",
		);
		const ariaGallery = escapeHtml(
			i18n.t("ui.ariaGallery") || "Галерея зображень",
		);
		const ariaPrev = escapeHtml(
			i18n.t("ui.ariaPrev") || "Попереднє зображення",
		);
		const ariaNext = escapeHtml(i18n.t("ui.ariaNext") || "Наступне зображення");
		const ariaClose = escapeHtml(i18n.t("ui.ariaClose") || "Закрити галерею");
		const ariaZoomedImg = escapeHtml(
			i18n.t("ui.ariaZoomedImg") || "Збільшене зображення",
		);

		const iconArrowLeft = escapeHtml(
			UI_CLASSES.icons?.arrowLeftSLine || "ri-arrow-left-s-line",
		);
		const iconArrowRight = escapeHtml(
			UI_CLASSES.icons?.arrowRightSLine || "ri-arrow-right-s-line",
		);
		const iconClose = escapeHtml(
			UI_CLASSES.icons?.closeLine || "ri-close-line",
		);
		const iconInfo = escapeHtml(
			UI_CLASSES.icons?.informationLine || "ri-information-line",
		);
		const iconArrowUp = escapeHtml(
			UI_CLASSES.icons?.arrowUpSLine || "ri-arrow-up-s-line",
		);

		const html = `
            <div id="gallery-overlay" tabindex="-1" class="${UI_CLASSES.galleryOverlay || "popup-overlay"} ${UI_CLASSES.hidden || "hidden"}" role="dialog" aria-modal="true" aria-label="${ariaGallery}">
                <div class="${UI_CLASSES.galleryTopBar}">
                    <div class="${UI_CLASSES.galleryCounter}">
                        <span id="gal-current">1</span> / <span id="gal-total">1</span>
                    </div>
                    <div class="${UI_CLASSES.galleryDivider}" aria-hidden="true"></div>
                    <div id="gal-top-title" class="${UI_CLASSES.galleryTopTitle}"></div>
                </div>

                <button id="gal-btn-prev" class="${UI_CLASSES.galleryBtn} ${UI_CLASSES.galleryPrev}" aria-label="${ariaPrev}"><i class="${iconArrowLeft}" aria-hidden="true"></i></button>
                <button id="gal-btn-next" class="${UI_CLASSES.galleryBtn} ${UI_CLASSES.galleryNext}" aria-label="${ariaNext}"><i class="${iconArrowRight}" aria-hidden="true"></i></button>
                <button id="gal-btn-close" class="${UI_CLASSES.galleryClose} modal-close" aria-label="${ariaClose}"><i class="${iconClose}" aria-hidden="true"></i></button>
                
                <div class="${UI_CLASSES.galleryContent}">
                    <div class="${UI_CLASSES.galleryImageWrapper}">
                        <img id="gallery-img" src="" alt="${ariaZoomedImg}" referrerpolicy="no-referrer">
                    </div>
                    
                    <div id="gallery-info-panel" class="${UI_CLASSES.galleryInfoPanel}">
                        <div id="gal-resizer" class="panel-resizer" aria-hidden="true"></div>

                        <button id="gal-toggle-details" class="${UI_CLASSES.galToggleBtn}" aria-expanded="false">
                            <i class="${iconInfo}" aria-hidden="true"></i> 
                            <span class="${UI_CLASSES.btnText || "btn-text"}">${showDetailsText}</span>
                            <i class="${iconArrowUp} ${UI_CLASSES.arrowIcon}" aria-hidden="true"></i>
                        </button>

                        <div class="${UI_CLASSES.galleryScrollContent || "gallery-scroll-content"}">
                            <div id="gallery-archive" class="${UI_CLASSES.galleryArchive} ${UI_CLASSES.hidden || "hidden"}"></div>
                            <div id="gallery-details" class="${UI_CLASSES.galleryDetails} ${UI_CLASSES.hidden || "hidden"}"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
		document.body.insertAdjacentHTML("beforeend", html);

		this.cacheDOM();
		this.bindEvents();
	}

	cacheDOM() {
		this.overlay = document.getElementById("gallery-overlay");
		this.img = document.getElementById("gallery-img");
		this.wrapper = document.querySelector(`.${UI_CLASSES.galleryImageWrapper}`);
		this.topTitle = document.getElementById("gal-top-title");
		this.archiveBlock = document.getElementById("gallery-archive");
		this.details = document.getElementById("gallery-details");
		this.currentCounter = document.getElementById("gal-current");
		this.totalCounter = document.getElementById("gal-total");
		this.infoPanel = document.getElementById("gallery-info-panel");
		this.toggleBtn = document.getElementById("gal-toggle-details");
		this.resizer = document.getElementById("gal-resizer");
		this.scrollContent = this.infoPanel.querySelector(
			`.${UI_CLASSES.galleryScrollContent || "gallery-scroll-content"}`,
		);

		this.prevBtn = document.getElementById("gal-btn-prev");
		this.nextBtn = document.getElementById("gal-btn-next");
		this.closeBtn = document.getElementById("gal-btn-close");
	}

	bindEvents() {
		if (this.resizer) {
			this.resizer.addEventListener("pointerdown", (e) => {
				e.preventDefault();
				e.stopPropagation();
				this.isPanelResizing = true;
				document.body.style.userSelect = "none";
				this.infoPanel.style.transition = "none";

				if (
					this.infoPanel.classList.contains(UI_CLASSES.collapsed || "collapsed")
				) {
					this.infoPanel.classList.remove(UI_CLASSES.collapsed || "collapsed");
					this.toggleBtn.setAttribute("aria-expanded", "true");
					const btnText = this.toggleBtn.querySelector(
						`.${UI_CLASSES.btnText || "btn-text"}`,
					);
					if (btnText)
						btnText.textContent =
							i18n.t("ui.hideDetails") || "Приховати деталі";
				}
			});
		}

		// Глобальні слухачі
		document.addEventListener("pointermove", this.handlePointerMove);
		document.addEventListener("pointerup", this.handlePointerUp);
		document.body.addEventListener("click", this.handleGlobalClick);
		document.addEventListener("keydown", this.handleKeyDown, true);

		// Локальні слухачі
		this.toggleBtn.addEventListener("click", this.handlePanelToggle);
		if (this.nextBtn)
			this.nextBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				this.next();
			});
		if (this.prevBtn)
			this.prevBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				this.prev();
			});
		if (this.closeBtn)
			this.closeBtn.addEventListener("click", this.closeGallery);
		this.overlay.addEventListener("click", this.handleOverlayClick);

		// Слухачі маніпуляцій зображенням
		this.wrapper.addEventListener("wheel", this.handleWheel, {
			passive: false,
		});
		this.wrapper.addEventListener("mousedown", this.handleDragStart);
		window.addEventListener("mousemove", this.handleDragMove);
		window.addEventListener("mouseup", this.handleDragEnd);

		this.wrapper.addEventListener("touchstart", this.handleTouchStart, { passive: false });
		window.addEventListener("touchmove", this.handleTouchMove, { passive: false });
		window.addEventListener("touchend", this.handleTouchEnd);
		window.addEventListener("touchcancel", this.handleTouchEnd);
	}

	handleOverlayClick(e) {
		if (this.wasDragged) {
			this.wasDragged = false;
			return;
		}
		if (e.target === this.wrapper) {
			this.closeGallery();
		}
	}

	handlePointerMove(e) {
		if (!this.isPanelResizing) return;

		if (!this.ticking) {
			window.requestAnimationFrame(() => {
				const btnHeight = this.toggleBtn.offsetHeight || 48;
				const topOffset = 80;
				const maxAllowedHeight = window.innerHeight - topOffset;

				const calculatedHeight = window.innerHeight - e.clientY;
				const newHeight = Math.max(
					btnHeight,
					Math.min(calculatedHeight, maxAllowedHeight),
				);

				this.infoPanel.style.height = `${newHeight}px`;
				this.lastPanelHeight = newHeight;
				this.ticking = false;
			});
			this.ticking = true;
		}
	}

	handlePointerUp() {
		if (this.isPanelResizing) {
			this.isPanelResizing = false;
			document.body.style.userSelect = "";

			const btnHeight = this.toggleBtn.offsetHeight || 48;

			if (this.lastPanelHeight <= btnHeight + 5) {
				this.infoPanel.classList.add(UI_CLASSES.collapsed || "collapsed");
				this.toggleBtn.setAttribute("aria-expanded", "false");
				const btnText = this.toggleBtn.querySelector(
					`.${UI_CLASSES.btnText || "btn-text"}`,
				);
				if (btnText)
					btnText.textContent = i18n.t("ui.showDetails") || "Показати деталі";
				this.infoPanel.style.height = `${btnHeight}px`;
				this.lastPanelHeight = null;
			}
		}
	}

	handlePanelToggle() {
		const isCurrentlyCollapsed = this.infoPanel.classList.contains(
			UI_CLASSES.collapsed || "collapsed",
		);
		const btnHeight = this.toggleBtn.offsetHeight || 48;
		const currentActualHeight = this.infoPanel.getBoundingClientRect().height;

		const willCollapse =
			!isCurrentlyCollapsed && currentActualHeight > btnHeight + 5;

		// Ліквідовано примусовий reflow (void this.infoPanel.offsetHeight). Використано requestAnimationFrame.
		requestAnimationFrame(() => {
			this.infoPanel.style.transition =
				"height 0.35s cubic-bezier(0.4, 0, 0.2, 1)";

			if (willCollapse) {
				this.infoPanel.style.height = `${btnHeight}px`;
				this.toggleBtn.setAttribute("aria-expanded", "false");
				const btnText = this.toggleBtn.querySelector(
					`.${UI_CLASSES.btnText || "btn-text"}`,
				);
				if (btnText)
					btnText.textContent = i18n.t("ui.showDetails") || "Показати деталі";

				setTimeout(() => {
					if (!this.isPanelResizing) {
						this.infoPanel.classList.add(UI_CLASSES.collapsed || "collapsed");
						this.infoPanel.style.transition = "none";
					}
				}, 350);
			} else {
				this.infoPanel.classList.remove(UI_CLASSES.collapsed || "collapsed");

				let targetHeight;
				if (this.lastPanelHeight && this.lastPanelHeight > btnHeight + 20) {
					targetHeight = this.lastPanelHeight;
				} else {
					const scrollHeight = this.scrollContent
						? this.scrollContent.scrollHeight
						: 0;
					targetHeight = btnHeight + scrollHeight;
				}

				const maxAllowedHeight = window.innerHeight - 80;
				targetHeight = Math.min(targetHeight, maxAllowedHeight);

				this.infoPanel.style.height = `${targetHeight}px`;
				this.toggleBtn.setAttribute("aria-expanded", "true");
				const btnText = this.toggleBtn.querySelector(
					`.${UI_CLASSES.btnText || "btn-text"}`,
				);
				if (btnText)
					btnText.textContent = i18n.t("ui.hideDetails") || "Приховати деталі";

				setTimeout(() => {
					if (!this.isPanelResizing) {
						this.infoPanel.style.transition = "none";
					}
				}, 350);
			}
		});
	}

	handleKeyDown(e) {
		if (this.overlay.classList.contains(UI_CLASSES.hidden || "hidden")) return;

		const triggerBlink = (btn) => {
			if (btn) {
				btn.classList.add("is-pressed");
				setTimeout(() => btn.classList.remove("is-pressed"), 150);
			}
		};

		if (["ArrowRight", "ArrowLeft"].includes(e.key)) {
			e.stopPropagation();
			e.preventDefault();

			if (e.key === "ArrowRight") {
				triggerBlink(this.nextBtn);
				this.next();
			}
			if (e.key === "ArrowLeft") {
				triggerBlink(this.prevBtn);
				this.prev();
			}
		}
	}

	handleWheel(e) {
		e.preventDefault();
		const zoomIntensity = 0.15;
		const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;
		const newScale = Math.min(Math.max(1, this.scale + delta), 8);

		const rect = this.wrapper.getBoundingClientRect();
		const mouseX = e.clientX - (rect.left + rect.width / 2);
		const mouseY = e.clientY - (rect.top + rect.height / 2);

		if (this.scale !== newScale) {
			const valX = (mouseX - this.translateX) / this.scale;
			const valY = (mouseY - this.translateY) / this.scale;

			this.translateX = mouseX - valX * newScale;
			this.translateY = mouseY - valY * newScale;
			this.scale = newScale;
		}

		if (this.scale <= 1) {
			this.scale = 1;
			this.translateX = 0;
			this.translateY = 0;
		}

		if (!this.ticking) {
			window.requestAnimationFrame(() => {
				this.applyTransform();
				this.ticking = false;
			});
			this.ticking = true;
		}
	}

	handleDragStart(e) {
		if (this.scale <= 1) return;
		this.isDragging = true;
		this.wasDragged = false;

		this.lastX = e.clientX;
		this.lastY = e.clientY;

		e.preventDefault();
		this.wrapper.style.cursor = "grabbing";
	}

	handleDragMove(e) {
		if (!this.isDragging) return;

		const deltaX = e.clientX - this.lastX;
		const deltaY = e.clientY - this.lastY;

		this.lastX = e.clientX;
		this.lastY = e.clientY;

		if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
			this.wasDragged = true;
		}

		const panSpeed = 1.8;
		this.translateX += deltaX * panSpeed;
		this.translateY += deltaY * panSpeed;

		if (!this.ticking) {
			window.requestAnimationFrame(() => {
				this.applyTransform();
				this.ticking = false;
			});
			this.ticking = true;
		}
	}

	handleDragEnd() {
		this.isDragging = false;
		if (this.wrapper) {
			this.wrapper.style.cursor = this.scale > 1 ? "grab" : "default";
		}
	}

	handleTouchStart(e) {
		if (e.touches.length === 2) {
			e.preventDefault();
			this.initialPinchDistance = Math.hypot(
				e.touches[0].clientX - e.touches[1].clientX,
				e.touches[0].clientY - e.touches[1].clientY
			);
			this.initialScale = this.scale;
		} else if (e.touches.length === 1) {
			this.isDragging = true;
			this.wasDragged = false;
			this.lastX = e.touches[0].clientX;
			this.lastY = e.touches[0].clientY;
			this.touchStartX = this.lastX;
			this.touchStartY = this.lastY;
			this.swipeProcessed = false;
		}
	}

	handleTouchMove(e) {
		if (this.overlay.classList.contains(UI_CLASSES.hidden || "hidden")) return;
		
		if (e.touches.length === 2) {
			e.preventDefault();
			const currentDistance = Math.hypot(
				e.touches[0].clientX - e.touches[1].clientX,
				e.touches[0].clientY - e.touches[1].clientY
			);
			
			if (this.initialPinchDistance) {
				const delta = currentDistance / this.initialPinchDistance;
				const newScale = Math.min(Math.max(1, this.initialScale * delta), 8);
				
				const rect = this.wrapper.getBoundingClientRect();
				const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
				const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
				const mouseX = centerX - (rect.left + rect.width / 2);
				const mouseY = centerY - (rect.top + rect.height / 2);

				if (this.scale !== newScale) {
					const valX = (mouseX - this.translateX) / this.scale;
					const valY = (mouseY - this.translateY) / this.scale;

					this.translateX = mouseX - valX * newScale;
					this.translateY = mouseY - valY * newScale;
					this.scale = newScale;
				}

				if (this.scale <= 1) {
					this.scale = 1;
					this.translateX = 0;
					this.translateY = 0;
				}

				if (!this.ticking) {
					window.requestAnimationFrame(() => {
						this.applyTransform();
						this.ticking = false;
					});
					this.ticking = true;
				}
			}
		} else if (e.touches.length === 1 && this.isDragging) {
			const deltaX = e.touches[0].clientX - this.lastX;
			const deltaY = e.touches[0].clientY - this.lastY;

			this.lastX = e.touches[0].clientX;
			this.lastY = e.touches[0].clientY;

			if (this.scale > 1) {
				e.preventDefault();
				if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
					this.wasDragged = true;
				}

				const panSpeed = 1.8;
				this.translateX += deltaX * panSpeed;
				this.translateY += deltaY * panSpeed;

				if (!this.ticking) {
					window.requestAnimationFrame(() => {
						this.applyTransform();
						this.ticking = false;
					});
					this.ticking = true;
				}
			} else if (!this.swipeProcessed) {
				// Detect horizontal swipe when scale == 1
				const totalDx = this.lastX - this.touchStartX;
				const totalDy = this.lastY - this.touchStartY;
				if (Math.abs(totalDx) > 40 && Math.abs(totalDx) > Math.abs(totalDy) * 1.5) {
					e.preventDefault();
					this.swipeProcessed = true;
					if (totalDx > 0) {
						this.prev();
					} else {
						this.next();
					}
				}
			}
		}
	}

	handleTouchEnd(e) {
		if (e.touches.length < 2) {
			this.initialPinchDistance = null;
		}
		if (e.touches.length === 0) {
			this.isDragging = false;
		}
	}

	handleImageClick(e) {
		// Універсальний селектор для перехоплення як data-full, так і data-src (для гербів)
		const trigger = e.target.closest(
			"[data-full], [data-src], .js-gallery-item",
		);
		if (!trigger) return;

		const interactiveEl = e.target.closest(
			"a, button, [data-id], .js-profile-link",
		);
		if (
			interactiveEl &&
			trigger.contains(interactiveEl) &&
			interactiveEl !== trigger
		) {
			return;
		}

		e.stopPropagation();
		e.preventDefault();

		// Синхронізація атрибутів груп
		const groupName =
			trigger.getAttribute("data-group") ||
			trigger.getAttribute("data-gallery");

		let allTriggers = [];

		if (groupName) {
			allTriggers = Array.from(
				document.querySelectorAll(
					`[data-group="${groupName}"], [data-gallery="${groupName}"]`,
				),
			);
		} else {
			// ФОЛБЕК ДЛЯ ОДИНОЧНИХ ЕЛЕМЕНТІВ (як герб)
			const searchSelector = `.${UI_CLASSES.recordsGrid || "records-grid"}, .gallery-group, .profile-block`;
			const container = trigger.closest(searchSelector);

			if (container) {
				allTriggers = Array.from(
					container.querySelectorAll(
						"[data-full], [data-src], .js-gallery-item",
					),
				);
			} else {
				allTriggers = [trigger]; // Ізолюємо одиночний елемент, якщо контейнер не знайдено
			}
		}

		this.galleryItems = [];
		let clickedItemIndex = 0;

		allTriggers.forEach((el) => {
			const rawUrls =
				el.getAttribute("data-full") ||
				el.getAttribute("data-src") ||
				el.src ||
				"";
			const urls = rawUrls
				.split(";")
				.map((u) => u.trim())
				.filter(Boolean);

			if (el === trigger) clickedItemIndex = this.galleryItems.length;

			urls.forEach((url) => {
				this.galleryItems.push({
					src: url,
					caption: el.getAttribute("data-caption") || el.alt || "",
					archiveName: el.getAttribute("data-archive-name") || "",
					archiveRef: el.getAttribute("data-archive-ref") || "",
					archiveAddress: el.getAttribute("data-archive-address") || "",
					transcription:
						el.querySelector(
							`.${UI_CLASSES.metaTranscription || "meta-transcription"}`,
						)?.innerHTML || "",
					link:
						el.querySelector(`.${UI_CLASSES.metaLink || "meta-link"}`)
							?.textContent || "",
				});
			});
		});

		if (this.galleryItems.length === 0) return;

		this.currentIndex = clickedItemIndex;
		this.updateGallery();

		this.triggerElement = document.activeElement || trigger;

		this.overlay.classList.remove(UI_CLASSES.hidden || "hidden");
		requestAnimationFrame(() => {
			this.overlay.classList.add("show", "open");
			this.overlay.focus();
		});

		document.body.classList.add(UI_CLASSES.noScroll || "no-scroll");
		document.body.classList.add("pswp-open");
	}

	applyTransform() {
		if (this.img) {
			this.img.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
		}
	}

	resetZoom() {
		this.scale = 1;
		this.translateX = 0;
		this.translateY = 0;
		this.applyTransform();
		if (this.wrapper) this.wrapper.style.cursor = "default";
	}

	next() {
		if (this.galleryItems.length <= 1) return;
		this.currentIndex = (this.currentIndex + 1) % this.galleryItems.length;
		this.updateGallery();
	}

	prev() {
		if (this.galleryItems.length <= 1) return;
		this.currentIndex =
			(this.currentIndex - 1 + this.galleryItems.length) %
			this.galleryItems.length;
		this.updateGallery();
	}

	closeGallery() {
		if (!this.overlay) return;
		this.overlay.classList.remove("show", "open");

		setTimeout(() => {
			this.overlay.classList.add(UI_CLASSES.hidden || "hidden");
			document.body.classList.remove(UI_CLASSES.noScroll || "no-scroll");
			document.body.classList.remove("pswp-open");
			this.resetZoom();
			this.lastPanelHeight = null;
			if (this.infoPanel) {
				this.infoPanel.style.transition = "";
				this.infoPanel.style.height = "";
			}

			if (this.triggerElement) {
				this.triggerElement.focus();
				this.triggerElement = null;
			}
		}, 250);
	}

	updateGallery() {
		const item = this.galleryItems[this.currentIndex];
		if (!item) return;

		this.resetZoom();
		this.img.src = item.src;

		// Санітизація заголовка
		this.topTitle.textContent = item.caption
			? escapeHtml(item.caption)
			: i18n.t("common.untitled") || "Без назви";

		this.currentCounter.textContent = this.currentIndex + 1;
		this.totalCounter.textContent = this.galleryItems.length;

		const displayNav = this.galleryItems.length <= 1 ? "none" : "flex";
		if (this.prevBtn) this.prevBtn.style.display = displayNav;
		if (this.nextBtn) this.nextBtn.style.display = displayNav;

		this.renderArchiveBlock(item);
		this.renderDetailsBlock(item);
	}

	renderArchiveBlock(item) {
		let html = "";
		const isStringValid = (str) =>
			str && str.trim() !== "" && str !== "undefined" && str !== "null";

		const iconBank = escapeHtml(UI_CLASSES.icons?.archive || "ri-bank-line");
		const iconFolder = escapeHtml(
			UI_CLASSES.icons?.folderOpenLine || "ri-folder-open-line",
		);
		const iconPin = escapeHtml(
			UI_CLASSES.icons?.mapPinLine || "ri-map-pin-line",
		);

		// Санітизація вхідних даних для захисту від XSS
		if (isStringValid(item.archiveName)) {
			html += `<div class="${UI_CLASSES.galArchiveTitle}"><i class="${iconBank}" aria-hidden="true"></i> ${escapeHtml(item.archiveName)}</div>`;
		}
		if (isStringValid(item.archiveRef)) {
			html += `<div class="${UI_CLASSES.galArchiveRef}"><i class="${iconFolder}" aria-hidden="true"></i> <span>${escapeHtml(item.archiveRef)}</span></div>`;
		}
		if (isStringValid(item.archiveAddress)) {
			html += `<div class="${UI_CLASSES.galArchiveAddress}"><i class="${iconPin}" aria-hidden="true"></i> ${escapeHtml(item.archiveAddress)}</div>`;
		}

		if (html) {
			this.archiveBlock.innerHTML = html;
			this.archiveBlock.classList.remove(UI_CLASSES.hidden || "hidden");
			this.archiveBlock.classList.add(UI_CLASSES.galArchiveActive || "active");
		} else {
			this.archiveBlock.classList.add(UI_CLASSES.hidden || "hidden");
			this.archiveBlock.classList.remove(
				UI_CLASSES.galArchiveActive || "active",
			);
		}
	}

	renderDetailsBlock(item) {
		let html = "";

		if (item.transcription && item.transcription.trim()) {
			html += `<div class="${UI_CLASSES.galTranscription || "gal-transcription"}">${item.transcription}</div>`;
		}

		if (item.link && item.link.trim()) {
			const openOriginalLabel = escapeHtml(
				i18n.t("ui.openOriginal") || "Відкрити оригінал",
			);
			const iconExternal = escapeHtml(
				UI_CLASSES.icons?.externalLinkLine || "ri-external-link-line",
			);
			// Атрибут href вимагає особливої обережності. encodeURI гарантує валідність URL.
			html += `<a href="${encodeURI(item.link)}" target="_blank" rel="noopener noreferrer" class="${UI_CLASSES.link || "meta-link"}"><i class="${iconExternal}" aria-hidden="true"></i> ${openOriginalLabel}</a>`;
		}

		if (html) {
			this.details.innerHTML = html;
			this.details.classList.remove(UI_CLASSES.hidden || "hidden");
		} else {
			this.details.classList.add(UI_CLASSES.hidden || "hidden");
		}
	}

	destroy() {
		document.removeEventListener("pointermove", this.handlePointerMove);
		document.removeEventListener("pointerup", this.handlePointerUp);
		document.body.removeEventListener("click", this.handleGlobalClick);
		document.removeEventListener("keydown", this.handleKeyDown, true);
		window.removeEventListener("mousemove", this.handleDragMove);
		window.removeEventListener("mouseup", this.handleDragEnd);

		if (this.resizer) this.resizer.replaceWith(this.resizer.cloneNode(true));
		if (this.toggleBtn)
			this.toggleBtn.removeEventListener("click", this.handlePanelToggle);
		if (this.wrapper) {
			this.wrapper.removeEventListener("wheel", this.handleWheel);
			this.wrapper.removeEventListener("mousedown", this.handleDragStart);
		}
		if (this.overlay)
			this.overlay.removeEventListener("click", this.handleOverlayClick);

		this.galleryItems = [];
	}
}
