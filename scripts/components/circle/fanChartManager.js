// ./scripts/components/circle/fanChartManager.js

import { buildPedigreeData } from "./pedigreeCalculator.js";
import { renderFanChartSVG, FAN_CONFIG } from "./fanChartRenderer.js";
import { escapeHtml } from "../../utils/helpers.js";

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

		this.activeGen = "all";
		this.selectedSosa = null;

		// Kinematic transform state
		this.scale = 1;
		this.translateX = 0;
		this.translateY = 0;
		this.minScale = 0.35;
		this.maxScale = 3.5;

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

			<!-- Полотно для зуму та драгу -->
			<div class="fan-chart-canvas" id="fan-chart-canvas">
				<div class="fan-chart-transform-layer" id="fan-transform-layer"></div>
			</div>

			<!-- Плаваюча панель масштабування -->
			<div class="fan-zoom-controls">
				<button class="fan-zoom-btn" id="fan-btn-zoom-in" title="Збільшити" aria-label="Збільшити масштаб">
					<i class="ri-add-line"></i>
				</button>
				<button class="fan-zoom-btn" id="fan-btn-fit" title="Вмістити" aria-label="Вмістити коло по центру">
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
		this.layer = this.container.querySelector("#fan-transform-layer");
		this.nav = this.container.querySelector("#fan-generation-nav");
		this.flyout = this.container.querySelector("#fan-flyout-card");
		this.zoomLevelDisplay = this.container.querySelector("#fan-zoom-level");

		// Обробники зуму
		this.container.querySelector("#fan-btn-zoom-in")?.addEventListener("click", () => this.zoom(1.2));
		this.container.querySelector("#fan-btn-zoom-out")?.addEventListener("click", () => this.zoom(0.83));
		this.container.querySelector("#fan-btn-fit")?.addEventListener("click", () => this.fitToScreen());

		// Кінематика полотна
		this.canvas.addEventListener("wheel", this._handleWheel, { passive: false });
		this.canvas.addEventListener("pointerdown", this._handlePointerDown);
		window.addEventListener("pointermove", this._handlePointerMove);
		window.addEventListener("pointerup", this._handlePointerUp);
		window.addEventListener("pointercancel", this._handlePointerUp);
		window.addEventListener("resize", this._handleResize);

		// Делегування подій на сектори
		this.layer.addEventListener("click", this._handleSectorClick);
		this.layer.addEventListener("pointerover", this._handleSectorHover);
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

		// Центруємо та оптимізуємо масштаб під екран
		requestAnimationFrame(() => {
			this.fitToScreen();
		});
	}

	_renderRings() {
		if (!this.layer || !this.pedigreeData) return;
		this.layer.innerHTML = "";

		const svg = renderFanChartSVG(this.pedigreeData, {
			activeGen: this.activeGen,
			selectedSosa: this.selectedSosa,
		});

		this.layer.appendChild(svg);
	}

	/**
	 * Рендерить кнопки поколінь у верхній стрічці
	 */
	_renderNavPills() {
		if (!this.nav || !this.pedigreeData) return;

		const labels = [
			"Ви",
			"Батьки",
			"Дідусі",
			"Прадідусі",
			"Пра²дідусі",
			"Пра³дідусі",
			"Пра⁴дідусі",
			"Пра⁵дідусі",
		];

		const generations = this.pedigreeData.generations || [];
		const maxGen = Math.min(generations.length, labels.length);

		let html = `
			<button class="fan-nav-pill ${this.activeGen === "all" ? "active" : ""}" data-gen="all">
				Усі <span class="fan-nav-pill-badge">${this.pedigreeData.totalKnown}</span>
			</button>
		`;

		for (let g = 0; g < maxGen; g++) {
			const genData = generations[g];
			if (!genData || (g > 3 && genData.knownCount === 0)) continue;

			const isActive = String(this.activeGen) === String(g);
			html += `
				<button class="fan-nav-pill ${isActive ? "active" : ""}" data-gen="${g}">
					${labels[g]} <span class="fan-nav-pill-badge">${genData.knownCount}</span>
				</button>
			`;
		}

		this.nav.innerHTML = html;

		// Обробник вибору покоління
		this.nav.querySelectorAll(".fan-nav-pill").forEach((btn) => {
			btn.addEventListener("click", (e) => {
				const gen = btn.getAttribute("data-gen");
				this.filterGeneration(gen);
			});
		});
	}

	/**
	 * Фільтрує або підсвічує обране покоління
	 */
	filterGeneration(gen) {
		this.activeGen = gen;
		this._renderNavPills();

		const svgRoot = this.layer?.querySelector("#fan-chart-svg-root");
		if (!svgRoot) return;

		const genGroups = svgRoot.querySelectorAll(".fan-generation-group");
		const probandGroup = svgRoot.querySelector(".fan-proband-group");

		if (gen === "all") {
			genGroups.forEach((g) => g.classList.remove("fan-gen--dimmed"));
			probandGroup?.classList.remove("fan-gen--dimmed");
		} else {
			const targetGen = Number(gen);
			genGroups.forEach((g) => {
				const gNum = Number(g.getAttribute("data-generation"));
				if (gNum === targetGen) {
					g.classList.remove("fan-gen--dimmed");
				} else {
					g.classList.add("fan-gen--dimmed");
				}
			});

			if (targetGen === 0) {
				probandGroup?.classList.remove("fan-gen--dimmed");
			} else {
				probandGroup?.classList.add("fan-gen--dimmed");
			}
		}
	}

	/**
	 * Вміщує коло по центру екрана зі збереженням пропорцій
	 */
	fitToScreen() {
		if (!this.container) return;
		const rect = this.container.getBoundingClientRect();
		const w = rect.width;
		const h = rect.height;

		const size = FAN_CONFIG.viewBoxSize; // 1000
		const pad = 80;
		const targetW = Math.max(w - pad, 280);
		const targetH = Math.max(h - pad - 60, 280);

		const scale = Math.min(targetW / size, targetH / size, 1.25);
		this.scale = Math.max(this.minScale, Math.min(scale, this.maxScale));

		this.translateX = (w - size * this.scale) / 2;
		this.translateY = (h - size * this.scale) / 2 + 20;

		this._applyTransform();
	}

	zoom(factor) {
		const newScale = Math.max(this.minScale, Math.min(this.scale * factor, this.maxScale));
		if (newScale === this.scale) return;

		const rect = this.container.getBoundingClientRect();
		const cx = rect.width / 2;
		const cy = rect.height / 2;

		this.translateX = cx - (cx - this.translateX) * (newScale / this.scale);
		this.translateY = cy - (cy - this.translateY) * (newScale / this.scale);
		this.scale = newScale;

		this._applyTransform();
	}

	_applyTransform() {
		if (!this.layer) return;
		this.layer.style.transform = `translate3d(${this.translateX}px, ${this.translateY}px, 0) scale(${this.scale})`;
		if (this.zoomLevelDisplay) {
			this.zoomLevelDisplay.textContent = `${Math.round(this.scale * 100)}%`;
		}
	}

	_handleWheel(e) {
		e.preventDefault();
		const zoomDelta = e.deltaY < 0 ? 1.12 : 0.89;
		const newScale = Math.max(this.minScale, Math.min(this.scale * zoomDelta, this.maxScale));
		if (newScale === this.scale) return;

		const rect = this.container.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;

		this.translateX = mouseX - (mouseX - this.translateX) * (newScale / this.scale);
		this.translateY = mouseY - (mouseY - this.translateY) * (newScale / this.scale);
		this.scale = newScale;

		this._applyTransform();
	}

	_handlePointerDown(e) {
		if (e.button !== 0 && e.pointerType === "mouse") return;
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

		if (sectorData && sectorData.isKnown && window.matchMedia("(min-width: 768px)").matches) {
			this.showFlyout(sectorData, e.clientX, e.clientY);
		}
	}

	_handleSectorClick(e) {
		if (this.hasMoved) return; // Ігноруємо клік після драгу

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
		const prev = this.layer?.querySelectorAll(".fan-sector--selected");
		prev?.forEach((el) => el.classList.remove("fan-sector--selected"));

		const current = this.layer?.querySelector(`[data-sosa="${sosa}"]`);
		current?.classList.add("fan-sector--selected");
	}

	/**
	 * Відображає плаваючу картку предка
	 */
	showFlyout(sectorData, clientX, clientY, isPinned = false) {
		if (!this.flyout || !sectorData || !sectorData.person) return;
		const p = sectorData.person;
		const sosa = sectorData.sosa;
		const isMaternal = sectorData.side === "maternal";

		const fullName = [p.name || p.first_name, p.surname || p.last_name].filter(Boolean).join(" ");
		const avatarUrl = p.photo || p.avatar;
		const dates = p.dates || p.lifespan || "";
		const place = p.living_place || p.location || p.place || "";
		const status = p.social_status || p.status || "";

		const avatarHtml = (avatarUrl && !avatarUrl.includes("placeholder"))
			? `<img src="${avatarUrl}" class="fan-flyout-avatar" alt="${escapeHtml(fullName)}" />`
			: `<span class="fan-flyout-avatar-initials">${(fullName.charAt(0) || "Я").toUpperCase()}</span>`;

		const recordsHtml = sectorData.hasRecords
			? `<div class="fan-flyout-badge-records"><i class="ri-file-text-line"></i> Документів: ${sectorData.recordsCount}</div>`
			: "";

		const placeHtml = place
			? `<div class="fan-flyout-row"><i class="ri-map-pin-2-line"></i> <span>${escapeHtml(place)}</span></div>`
			: "";

		const statusHtml = status
			? `<div class="fan-flyout-row"><i class="ri-user-star-line"></i> <span>${escapeHtml(status)}</span></div>`
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
					${dates ? `<div class="fan-flyout-meta">${escapeHtml(dates)}</div>` : ""}
				</div>
			</div>
			<div class="fan-flyout-body">
				${placeHtml}
				${statusHtml}
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
			const flyoutH = this.flyout.offsetHeight || 190;
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
