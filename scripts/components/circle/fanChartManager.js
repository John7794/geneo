// ./scripts/components/circle/fanChartManager.js

import { buildPedigreeData, getGenerationRibbonLabel } from "./pedigreeCalculator.js";
import { renderFanChartSVG, FAN_CONFIG } from "./fanChartRenderer.js";
import { escapeHtml, convertDriveLink } from "../../utils/helpers.js";

export class FanChartManager {
	/**
	 * @param {object} engine - FamilyEngine
	 * @param {object} callbacks - { onNavigateToProfile: (id) => void, onCenterOnPerson: (id) => void }
	 */
	constructor(engine, callbacks = {}) {
		this.engine = engine;
		this.callbacks = callbacks;

		this.container = document.getElementById("fan-chart-view");
		this.currentPersonId = null;
		this.pedigreeData = null;

		// Множина активних поколінь (підтримка комбінації з декількох рівнів)
		this.activeGens = new Set(["all"]);
		this.selectedSosa = null;

		// Векторний трансформ SVG <g id="fan-viewport">
		this.scale = 1;
		this.translateX = 0;
		this.translateY = 0;
		this.minScale = 0.2;
		this.maxScale = 4.0;
		this.step = 0.25;

		// Drag tracking
		this.isDragging = false;
		this.startX = 0;
		this.startY = 0;
		this.initialTx = 0;
		this.initialTy = 0;
		this.hasMoved = false;

		// Touch pinch tracking
		this.initialPinchDistance = null;
		this.initialPinchScale = 1;
		this.pinchCenterX = 0;
		this.pinchCenterY = 0;

		this._handleWheel = this._handleWheel.bind(this);
		this._handlePointerDown = this._handlePointerDown.bind(this);
		this._handlePointerMove = this._handlePointerMove.bind(this);
		this._handlePointerUp = this._handlePointerUp.bind(this);
		this._handleSectorClick = this._handleSectorClick.bind(this);
		this._handleSectorHover = this._handleSectorHover.bind(this);
		this._handleResize = this._handleResize.bind(this);

		this._buildDOM();
	}

	_buildDOM() {
		if (!this.container) return;
		this.container.innerHTML = `
			<!-- Верхня стрічка фільтрації поколінь -->
			<nav class="fan-generation-nav" id="fan-generation-nav" aria-label="Фільтр поколінь"></nav>

			<!-- Полотно для SVG -->
			<div class="fan-chart-canvas" id="fan-chart-canvas"></div>

			<!-- Плаваюча панель масштабування (ідентична до дерева) -->
			<div class="fan-zoom-controls">
				<button class="fan-zoom-btn" id="fan-btn-zoom-in" title="Збільшити" aria-label="Збільшити масштаб">
					<i class="ri-add-line"></i>
				</button>
				<button class="fan-zoom-btn" id="fan-btn-fit" title="Скинути" aria-label="Вмістити коло по центру">
					<i class="ri-fullscreen-line"></i>
				</button>
				<button class="fan-zoom-btn" id="fan-btn-zoom-out" title="Зменшити" aria-label="Зменшити масштаб">
					<i class="ri-subtract-line"></i>
				</button>
				<span class="fan-zoom-level" id="fan-zoom-level">100%</span>
			</div>

			<!-- Спливаюча картка-тултіп предка -->
			<div class="fan-flyout-card hidden" id="fan-flyout-card" role="dialog" aria-modal="false"></div>
		`;

		this.canvas = this.container.querySelector("#fan-chart-canvas");
		this.nav = this.container.querySelector("#fan-generation-nav");
		this.flyout = this.container.querySelector("#fan-flyout-card");
		this.zoomLevelDisplay = this.container.querySelector("#fan-zoom-level");

		// Обробники зуму через кнопки
		this.container.querySelector("#fan-btn-zoom-in")?.addEventListener("click", () => this.zoomByButton(1));
		this.container.querySelector("#fan-btn-zoom-out")?.addEventListener("click", () => this.zoomByButton(-1));
		this.container.querySelector("#fan-btn-fit")?.addEventListener("click", () => this.fitToScreen());

		// Кінематика полотна (ідентична до режиму дерева)
		this.canvas.addEventListener("wheel", this._handleWheel, { passive: false });
		this.canvas.addEventListener("pointerdown", this._handlePointerDown);
		window.addEventListener("pointermove", this._handlePointerMove);
		window.addEventListener("pointerup", this._handlePointerUp);
		window.addEventListener("pointercancel", this._handlePointerUp);
		window.addEventListener("resize", this._handleResize);

		// Делегування подій на сектори
		this.canvas.addEventListener("click", this._handleSectorClick);
		this.canvas.addEventListener("pointerover", this._handleSectorHover);
		this.canvas.addEventListener("pointerout", this._handleSectorOut);
		this.canvas.addEventListener("pointerleave", this._handleCanvasLeave);
	}

	/**
	 * Рендерить коло роду для обраної особи
	 * @param {string|number} personId 
	 */
	render(personId) {
		if (!personId || !this.engine) return;
		this.currentPersonId = String(personId);

		// Розрахунок предків до 7 поколінь (8 поколінь сумарно)
		this.pedigreeData = buildPedigreeData(this.engine, this.currentPersonId, 7);

		this._renderRings();
		this._renderNavPills();
		this.hideFlyout();

		// Точне центрування кола на екрані
		requestAnimationFrame(() => {
			this.fitToScreen();
		});
	}

	_renderRings() {
		if (!this.canvas || !this.pedigreeData) return;
		this._cachedSectorEls = null;
		this.viewport = null;
		this.canvas.innerHTML = "";

		const svg = renderFanChartSVG(this.pedigreeData, {
			activeGens: this.activeGens,
			selectedSosa: this.selectedSosa,
		});

		this.canvas.appendChild(svg);
		this.svgElement = svg;
		this.viewportGroup = svg.querySelector("#fan-viewport");
	}

	/**
	 * Рендерить кнопки поколінь у верхній стрічці
	 */
	_renderNavPills() {
		if (!this.nav || !this.pedigreeData) return;

		const generations = this.pedigreeData.generations || [];
		const isAllActive = this.activeGens.has("all");

		let html = `
			<button class="fan-nav-pill ${isAllActive ? "active" : ""}" data-gen="all">
				Усі <span class="fan-nav-pill-badge">${this.pedigreeData.totalKnown}</span>
			</button>
		`;

		for (let g = 0; g < generations.length; g++) {
			const genData = generations[g];
			if (!genData || (g > 3 && genData.knownCount === 0)) continue;

			const isGenActive = !isAllActive && (this.activeGens.has(String(g)) || this.activeGens.has(g));
			const label = getGenerationRibbonLabel(g);

			html += `
				<button class="fan-nav-pill ${isGenActive ? "active" : ""}" data-gen="${g}">
					${label} <span class="fan-nav-pill-badge">${genData.knownCount}</span>
				</button>
			`;
		}

		this.nav.innerHTML = html;

		// Обробник вибору покоління (підтримка комбінації з декількох рівнів)
		this.nav.querySelectorAll(".fan-nav-pill").forEach((btn) => {
			btn.addEventListener("click", (e) => {
				const gen = btn.getAttribute("data-gen");
				this.toggleGenerationLevel(gen);
			});
		});
	}

	/**
	 * Перемикає покоління або додає/прибирає його з комбінації
	 * @param {string} gen 
	 */
	toggleGenerationLevel(gen) {
		const generations = this.pedigreeData?.generations || [];
		const validGens = generations.filter((g, idx) => idx <= 3 || g.knownCount > 0).map(g => String(g.generation));

		if (gen === "all") {
			this.activeGens.clear();
			this.activeGens.add("all");
		} else {
			if (this.activeGens.has("all")) {
				// Якщо було обрано "Усі", перехід на конкретний рівень
				this.activeGens.clear();
				this.activeGens.add(gen);
			} else {
				// Додавання або вилучення з комбінації
				if (this.activeGens.has(gen)) {
					this.activeGens.delete(gen);
					// Якщо нічого не обрано — повертаємося до "Усі"
					if (this.activeGens.size === 0) {
						this.activeGens.add("all");
					}
				} else {
					this.activeGens.add(gen);
					// Якщо обрано всі можливі рівні — активуємо "Усі"
					const allSelected = validGens.every(g => this.activeGens.has(g));
					if (allSelected) {
						this.activeGens.clear();
						this.activeGens.add("all");
					}
				}
			}
		}

		this._updateGenerationVisibility();
		this._renderNavPills();
	}

	_updateGenerationVisibility() {
		const svgRoot = this.svgElement || this.container.querySelector("#fan-chart-svg-root");
		if (!svgRoot) return;

		const genGroups = svgRoot.querySelectorAll(".fan-generation-group");
		const probandGroup = svgRoot.querySelector(".fan-proband-group");
		const isAllActive = this.activeGens.has("all");

		if (isAllActive) {
			genGroups.forEach((g) => g.classList.remove("fan-gen--dimmed"));
			probandGroup?.classList.remove("fan-gen--dimmed");
		} else {
			genGroups.forEach((g) => {
				const gNum = g.getAttribute("data-generation");
				if (this.activeGens.has(gNum)) {
					g.classList.remove("fan-gen--dimmed");
				} else {
					g.classList.add("fan-gen--dimmed");
				}
			});

			if (this.activeGens.has("0") || this.activeGens.has(0)) {
				probandGroup?.classList.remove("fan-gen--dimmed");
			} else {
				probandGroup?.classList.add("fan-gen--dimmed");
			}
		}
	}

	/**
	 * Точне центрування кола роду по центру екрана зі збереженням пропорцій
	 */
	fitToScreen() {
		if (!this.container) return;
		const rect = this.container.getBoundingClientRect();
		const w = rect.width;
		const h = rect.height;

		const chartDiameter = 920; // 460px радіус * 2
		const pad = 80;
		const targetW = Math.max(w - pad, 280);
		const targetH = Math.max(h - pad - 60, 280);

		const scale = Math.min(targetW / chartDiameter, targetH / chartDiameter, 1.2);
		this.scale = Math.max(this.minScale, Math.min(scale, this.maxScale));

		// Центр кола (500, 500) розміщується точно по центру вікна
		this.translateX = w / 2 - 500 * this.scale;
		this.translateY = (h + 40) / 2 - 500 * this.scale; // Невеликий зсув вниз через верхню панель

		this._applyTransform();
	}

	/**
	 * Зум через кнопки панелі керування (по центру екрана)
	 */
	zoomByButton(direction) {
		const rect = this.container.getBoundingClientRect();
		const cx = rect.width / 2;
		const cy = (rect.height + 40) / 2;
		const factor = direction > 0 ? 1 + this.step : 1 / (1 + this.step);
		this.zoomAtPoint(factor, cx, cy);
	}

	/**
	 * Зум у точці з координатами (mouseX, mouseY)
	 */
	zoomAtPoint(factor, mouseX, mouseY) {
		const newScale = Math.max(this.minScale, Math.min(this.scale * factor, this.maxScale));
		if (newScale === this.scale) return;

		// Світові координати точки під курсором до зуму
		const worldX = (mouseX - this.translateX) / this.scale;
		const worldY = (mouseY - this.translateY) / this.scale;

		this.scale = newScale;
		this.translateX = mouseX - worldX * this.scale;
		this.translateY = mouseY - worldY * this.scale;

		this._applyTransform();
	}

	/**
	 * Панорамування полотна
	 */
	pan(dx, dy) {
		this.translateX += dx;
		this.translateY += dy;
		this._applyTransform();
	}

	_applyTransform() {
		if (!this.viewportGroup) {
			this.viewportGroup = this.container.querySelector("#fan-viewport");
		}
		if (this.viewportGroup) {
			// Векторний трансформ SVG групи — усуває розмиття пікселів при будь-якому масштабі!
			this.viewportGroup.setAttribute(
				"transform",
				`translate(${this.translateX.toFixed(2)}, ${this.translateY.toFixed(2)}) scale(${this.scale.toFixed(4)})`
			);
		}
		if (this.zoomLevelDisplay) {
			this.zoomLevelDisplay.textContent = `${Math.round(this.scale * 100)}%`;
		}
	}

	/**
	 * Поведінка скролу як у режимі дерева:
	 * Якщо затиснуто Ctrl/Meta — плавний зум до курсора.
	 * Інакше — плавне панорамування полотна.
	 */
	_handleWheel(e) {
		e.preventDefault();
		e.stopPropagation();

		const rect = this.container.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;

		if (e.ctrlKey || e.metaKey) {
			// Ctrl + Wheel: Плавний зум до точки курсора
			const isTouchpad = Math.abs(e.deltaY) < 50;
			const dynamicStep = isTouchpad ? 0.05 : 0.15;
			const factor = e.deltaY < 0 ? 1 + dynamicStep : 1 - dynamicStep;
			this.zoomAtPoint(factor, mouseX, mouseY);
		} else {
			// Звичайний скрол: панорамування
			this.pan(-e.deltaX, -e.deltaY);
		}
	}

	_handlePointerDown(e) {
		if (e.button !== 0 && e.pointerType === "mouse") return;
		if (e.target.closest("button, a, .fan-nav-pill, .fan-zoom-btn")) return;

		this.isDragging = true;
		this.hasMoved = false;
		this.startX = e.clientX;
		this.startY = e.clientY;
		this.initialTx = this.translateX;
		this.initialTy = this.translateY;

		this.canvas?.classList.add("is-dragging");
	}

	_handlePointerMove(e) {
		if (!this.isDragging) return;
		const dx = e.clientX - this.startX;
		const dy = e.clientY - this.startY;

		if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
			this.hasMoved = true;
		}

		this.translateX = this.initialTx + dx;
		this.translateY = this.initialTy + dy;
		this._applyTransform();
	}

	_handlePointerUp() {
		this.isDragging = false;
		this.canvas?.classList.remove("is-dragging");
	}

	_handleResize() {
		if (this.container && !this.container.classList.contains("hidden")) {
			this.fitToScreen();
		}
	}

	_handleSectorHover(e) {
		const target = e.target.closest(".fan-sector, .fan-proband-group");
		if (!target || this.isDragging) return;

		const sosaStr = target.getAttribute("data-sosa");
		if (!sosaStr) return;
		const sosa = Number(sosaStr);
		const sectorData = this.pedigreeData?.sosaMap?.get(sosa);

		// Динамічне підсвічування гілки предків від пробанда до обраного сектора
		this._highlightBranch(sosa);

		if (sectorData && sectorData.isKnown && window.matchMedia("(min-width: 768px)").matches) {
			this.showFlyout(sectorData, e.clientX, e.clientY);
		}
	}

	_handleSectorOut(e) {
		if (this.isDragging) return;
		const related = e.relatedTarget;
		const nextSector = related?.closest(".fan-sector, .fan-proband-group");
		if (!nextSector) {
			this._clearBranchHighlight();
			if (!this.selectedSosa) {
				this.hideFlyout();
			}
		}
	}

	_handleCanvasLeave() {
		this._clearBranchHighlight();
		if (!this.selectedSosa) {
			this.hideFlyout();
		}
	}

	_highlightBranch(sosa) {
		if (!this.viewport) {
			this.viewport = this.canvas?.querySelector("#fan-viewport");
		}
		if (!this.viewport) return;

		if (sosa === 1) {
			this._clearBranchHighlight();
			const probandEl = this.canvas?.querySelector(".fan-proband-group");
			probandEl?.classList.add("fan-proband--hovered");
			return;
		}

		const branchSosas = new Set();
		// 1. Лінія предків до пробанда (sosa -> 1)
		let curr = sosa;
		while (curr >= 1) {
			branchSosas.add(curr);
			curr = Math.floor(curr / 2);
		}

		// 2. Всі предки, що відходять від цього сектора назовні (його піддерево)
		if (Array.isArray(this.pedigreeData?.sectors)) {
			for (let i = 0; i < this.pedigreeData.sectors.length; i++) {
				const sec = this.pedigreeData.sectors[i];
				let a = sec.sosa;
				while (a > sosa) {
					a = Math.floor(a / 2);
				}
				if (a === sosa) {
					branchSosas.add(sec.sosa);
				}
			}
		}

		this.viewport.classList.add("fan-branch-active");

		if (!this._cachedSectorEls) {
			this._cachedSectorEls = Array.from(this.canvas.querySelectorAll(".fan-sector, .fan-proband-group"));
		}

		for (let i = 0; i < this._cachedSectorEls.length; i++) {
			const el = this._cachedSectorEls[i];
			const s = Number(el.getAttribute("data-sosa"));
			if (branchSosas.has(s)) {
				el.classList.add("fan-sector--branch-highlight");
				if (s === sosa) {
					el.classList.add("fan-sector--hovered");
				} else {
					el.classList.remove("fan-sector--hovered");
				}
			} else {
				el.classList.remove("fan-sector--branch-highlight");
				el.classList.remove("fan-sector--hovered");
			}
		}
	}

	_clearBranchHighlight() {
		if (!this.viewport) {
			this.viewport = this.canvas?.querySelector("#fan-viewport");
		}
		if (!this.viewport) return;
		this.viewport.classList.remove("fan-branch-active");
		if (this._cachedSectorEls) {
			for (let i = 0; i < this._cachedSectorEls.length; i++) {
				const el = this._cachedSectorEls[i];
				el.classList.remove("fan-sector--branch-highlight");
				el.classList.remove("fan-sector--hovered");
			}
		}
		const probandEl = this.canvas?.querySelector(".fan-proband-group");
		probandEl?.classList.remove("fan-proband--hovered");
	}

	_handleSectorClick(e) {
		if (this.hasMoved) return; // Ігноруємо клік після перетягування

		const target = e.target.closest(".fan-sector, .fan-proband-group");
		if (!target) {
			this.hideFlyout();
			return;
		}

		const sosaStr = target.getAttribute("data-sosa");
		if (!sosaStr) return;
		const sosa = Number(sosaStr);
		const sectorData = this.pedigreeData?.sosaMap?.get(sosa);

		if (sectorData && sectorData.isKnown) {
			this.selectedSosa = sosa;
			this._highlightSelectedSector(sosa);
			this.showFlyout(sectorData, e.clientX, e.clientY, true);
		}
	}

	_highlightSelectedSector(sosa) {
		const prev = this.canvas?.querySelectorAll(".fan-sector--selected");
		prev?.forEach((el) => el.classList.remove("fan-sector--selected"));

		const current = this.canvas?.querySelector(`[data-sosa="${sosa}"]`);
		current?.classList.add("fan-sector--selected");
	}

	/**
	 * Відображає плаваючу картку предка з бейджем статусу як у профілі
	 */
	showFlyout(sectorData, clientX, clientY, isPinned = false) {
		if (!this.flyout || !sectorData || !sectorData.person) return;
		const p = sectorData.person;
		const sosa = sectorData.sosa;
		const isMaternal = sectorData.side === "maternal";
		const isConfirmed = sectorData.isConfirmed;

		const fullName = [p.name || p.first_name, p.surname || p.last_name].filter(Boolean).join(" ");
		let avatarUrl = p.photo || p.avatar;
		if (avatarUrl && String(avatarUrl).includes("google.com")) {
			avatarUrl = convertDriveLink(avatarUrl);
		}
		const hasRealPhoto = avatarUrl &&
			!avatarUrl.includes("placeholder") &&
			!avatarUrl.includes("male.png") &&
			!avatarUrl.includes("female.png") &&
			!avatarUrl.startsWith("data:image/svg+xml");

		const f = (p.name || p.first_name || "").charAt(0);
		const l = (p.surname || p.last_name || "").charAt(0);
		let initialsStr = "";
		if (f && l) initialsStr = (f + l).toUpperCase();
		else if (f) initialsStr = f.toUpperCase();
		else if (l) initialsStr = l.toUpperCase();
		else initialsStr = "?";

		const avatarHtml = hasRealPhoto
			? `<img src="${avatarUrl}" class="fan-flyout-avatar" alt="${escapeHtml(fullName)}" referrerpolicy="no-referrer" onerror="this.parentElement.innerHTML='<span class=\\'fan-flyout-avatar-initials\\'>${escapeHtml(initialsStr)}</span>';" />`
			: `<span class="fan-flyout-avatar-initials">${escapeHtml(initialsStr)}</span>`;

		const dates = p.dates || p.lifespan || "";
		const displayDates = sectorData.lifeYears || dates;

		// Бейдж статусу підтвердження як у профілі (без зайвих іконок)
		const statusBadgeHtml = `
			<div class="profile-status-pill ${isConfirmed ? "status-badge--confirmed" : "status-badge--hypothetical"}">
				<span class="status-text">${isConfirmed ? "Підтверджений зв'язок" : "Гіпотетичний зв'язок"}</span>
			</div>
		`;

		const recordsHtml = sectorData.hasRecords
			? `<div class="fan-flyout-badge-records"><i class="ri-file-text-line"></i> Документів: ${sectorData.recordsCount}</div>`
			: "";

		const birthHtml = sectorData.birth?.info
			? `<div class="fan-flyout-row fan-flyout-row--birth"><i class="ri-cake-2-line" title="Народження"></i> <span>${escapeHtml(sectorData.birth.info)}</span></div>`
			: "";

		const deathHtml = sectorData.death?.info
			? `<div class="fan-flyout-row fan-flyout-row--death"><i class="ri-cross-line" title="Смерть"></i> <span>${escapeHtml(sectorData.death.info)}</span></div>`
			: "";

		const jobHtml = p.job
			? `<div class="fan-flyout-row"><i class="ri-briefcase-line"></i> <span>${escapeHtml(p.job)}</span></div>`
			: "";

		const kinshipClass = isMaternal ? "fan-flyout-kinship-badge fan-flyout-kinship-badge--maternal" : "fan-flyout-kinship-badge";

		this.flyout.innerHTML = `
			<button class="fan-flyout-close" id="fan-btn-flyout-close" aria-label="Закрити"><i class="ri-close-line"></i></button>
			<div class="fan-flyout-header">
				<div class="fan-flyout-avatar-box">
					${avatarHtml}
				</div>
				<div class="fan-flyout-title-wrap">
					<span class="${kinshipClass}">№ ${sosa} • ${escapeHtml(sectorData.kinshipTitle)}</span>
					<h4 class="fan-flyout-name" title="${escapeHtml(fullName)}">${escapeHtml(fullName)}</h4>
					${displayDates ? `<div class="fan-flyout-meta">${escapeHtml(displayDates)}</div>` : ""}
				</div>
			</div>
			<div class="fan-flyout-status-container">
				${statusBadgeHtml}
			</div>
			<div class="fan-flyout-body">
				${birthHtml}
				${deathHtml}
				${jobHtml}
				${recordsHtml}
			</div>
			<div class="fan-flyout-actions">
				<button class="fan-flyout-btn fan-flyout-btn--primary" id="fan-btn-goto-profile">
					<i class="ri-user-3-line"></i> Профіль
				</button>
				<button class="fan-flyout-btn" id="fan-btn-center-person">
					<i class="ri-focus-3-line"></i> В центр
				</button>
			</div>
		`;

		this.flyout.classList.remove("hidden");

		// Прив'язка кнопок дій
		this.flyout.querySelector("#fan-btn-flyout-close")?.addEventListener("click", () => this.hideFlyout());

		this.flyout.querySelector("#fan-btn-goto-profile")?.addEventListener("click", () => {
			if (sectorData.personId && typeof this.callbacks.onNavigateToProfile === "function") {
				this.callbacks.onNavigateToProfile(sectorData.personId);
			}
		});

		this.flyout.querySelector("#fan-btn-center-person")?.addEventListener("click", () => {
			if (sectorData.personId && typeof this.callbacks.onCenterOnPerson === "function") {
				this.callbacks.onCenterOnPerson(sectorData.personId);
			}
		});

		// Позиціонування на десктопі
		if (window.matchMedia("(min-width: 768px)").matches) {
			const flyoutW = 290;
			const flyoutH = this.flyout.offsetHeight || 210;
			let posX = clientX + 16;
			let posY = clientY - 40;

			if (posX + flyoutW > window.innerWidth - 16) {
				posX = clientX - flyoutW - 16;
			}
			if (posY + flyoutH > window.innerHeight - 16) {
				posY = window.innerHeight - flyoutH - 16;
			}
			if (posY < 16) posY = 16;

			this.flyout.style.left = `${posX}px`;
			this.flyout.style.top = `${posY}px`;
		}
	}

	hideFlyout() {
		if (this.flyout) {
			this.flyout.classList.add("hidden");
		}
	}

	destroy() {
		this.canvas?.removeEventListener("wheel", this._handleWheel);
		this.canvas?.removeEventListener("pointerdown", this._handlePointerDown);
		window.removeEventListener("pointermove", this._handlePointerMove);
		window.removeEventListener("pointerup", this._handlePointerUp);
		window.removeEventListener("pointercancel", this._handlePointerUp);
		window.removeEventListener("resize", this._handleResize);
	}
}
