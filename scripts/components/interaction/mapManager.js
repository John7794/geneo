// ./scripts/components/interaction/mapManager.js

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { COLUMNS } from "../../core/dbSchema.js";
import { i18n } from "../../core/i18n.js";
import { resolvePlaceDetails } from "../../utils/geoUtils.js";
import { findPersonDetails, formatPersonDisplay, getAvatarUrl } from "../../utils/personUtils.js";
import { escapeHtml } from "../../utils/helpers.js";

const TILES = {
	light: {
		url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
		attribution: 'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a>',
		maxZoom: 18,
	},
	dark: {
		url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
		attribution: 'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a>',
		maxZoom: 18,
	},
};

export class MapManager {
	constructor(engine, router) {
		this.engine = engine;
		this.router = router;

		this.container = document.getElementById("map-view");
		this.mapInstance = null;
		this.tileLayer = null;
		this.markersLayer = null;

		this.currentFilter = "all"; // 'all' | 'birth' | 'marriage' | 'death' | 'domicile'
		this.placesData = new Map();
		this.isInitialized = false;

		this._handleThemeChange = this._handleThemeChange.bind(this);
		this._setupDom();
	}

	_setupDom() {
		if (!this.container) return;

		this.container.innerHTML = `
			<div class="map-floating-bar" id="map-filter-bar">
				<button type="button" class="map-filter-pill active" data-filter="all">
					<i class="ri-map-pin-2-line"></i> Усі локації <span class="badge" id="map-badge-all">0</span>
				</button>
				<button type="button" class="map-filter-pill" data-filter="birth">
					<i class="ri-user-smile-line" style="color: #10b981;"></i> Народження <span class="badge" id="map-badge-birth">0</span>
				</button>
				<button type="button" class="map-filter-pill" data-filter="marriage">
					<i class="ri-heart-line" style="color: #ec4899;"></i> Шлюби <span class="badge" id="map-badge-marriage">0</span>
				</button>
				<button type="button" class="map-filter-pill" data-filter="death">
					<i class="ri-hourglass-line" style="color: #64748b;"></i> Смерті <span class="badge" id="map-badge-death">0</span>
				</button>
				<button type="button" class="map-filter-pill" data-filter="domicile">
					<i class="ri-home-2-line" style="color: #3b82f6;"></i> Проживання <span class="badge" id="map-badge-domicile">0</span>
				</button>
			</div>

			<div class="map-actions-dock">
				<button type="button" class="map-action-btn" id="map-btn-fit" title="Показати всі локації" aria-label="Показати всі локації">
					<i class="ri-fullscreen-line"></i>
				</button>
			</div>

			<div id="map-leaflet-canvas" class="map-container"></div>
		`;

		// Filter handlers
		const filterBar = this.container.querySelector("#map-filter-bar");
		if (filterBar) {
			filterBar.addEventListener("click", (e) => {
				const btn = e.target.closest(".map-filter-pill");
				if (!btn) return;
				const filter = btn.getAttribute("data-filter") || "all";
				this.setFilter(filter);
			});
		}

		// Action handlers
		const btnFit = this.container.querySelector("#map-btn-fit");
		if (btnFit) {
			btnFit.addEventListener("click", () => this.fitAllBounds());
		}



		// Theme change listener
		const observer = new MutationObserver((mutations) => {
			for (const m of mutations) {
				if (m.type === "attributes" && m.attributeName === "class") {
					this._handleThemeChange();
				}
			}
		});
		observer.observe(document.documentElement, { attributes: true });
	}

	initMap() {
		if (this.isInitialized && this.mapInstance) return;

		const canvas = document.getElementById("map-leaflet-canvas");
		if (!canvas) return;

		const isDark = document.documentElement.classList.contains("theme-dark");
		const tileConfig = isDark ? TILES.dark : TILES.light;

		// Default center roughly on Eastern Europe (Ukraine / Western Eurasia)
		this.mapInstance = L.map(canvas, {
			zoomControl: false,
			attributionControl: false,
			minZoom: 3,
			maxZoom: 18,
		}).setView([51.5, 31.0], 6);

		// Zoom control bottom-left
		L.control.zoom({ position: "bottomleft" }).addTo(this.mapInstance);

		// Attribution bottom-right
		L.control.attribution({ position: "bottomright", prefix: false }).addTo(this.mapInstance);

		this.tileLayer = L.tileLayer(tileConfig.url, {
			attribution: tileConfig.attribution,
			maxZoom: tileConfig.maxZoom,
		}).addTo(this.mapInstance);

		this.markersLayer = L.layerGroup().addTo(this.mapInstance);
		this.isInitialized = true;
	}

	_handleThemeChange() {
		if (!this.mapInstance || !this.tileLayer) return;
		const isDark = document.documentElement.classList.contains("theme-dark");
		const tileConfig = isDark ? TILES.dark : TILES.light;
		this.tileLayer.setUrl(tileConfig.url);
	}

	setFilter(filter) {
		this.currentFilter = filter;

		// Update UI pill active states
		const pills = this.container.querySelectorAll(".map-filter-pill");
		pills.forEach((p) => {
			if (p.getAttribute("data-filter") === filter) {
				p.classList.add("active");
			} else {
				p.classList.remove("active");
			}
		});

		this._renderMarkers();
	}

	aggregatePlaces() {
		this.placesData.clear();

		const engine = this.engine || window.app?.engine;
		if (!engine) return;

		const db = engine.db || engine;
		if (!db) return;

		const lineageManager = window.app?.managers?.lineage;
		const isLineageFiltered = Boolean(lineageManager && lineageManager.mode && lineageManager.mode !== "all");
		const visibleIds = isLineageFiltered
			? new Set((lineageManager.queue || []).map(String))
			: null;

		const getPersonInfo = (pid) => {
			if (!pid) return { name: "Невідомо", id: pid, avatar: "" };
			const d = findPersonDetails(pid, engine);
			if (!d) return { name: String(pid), id: pid, avatar: "" };
			const name = formatPersonDisplay({
				surname: d.surname || d.maidenName || "",
				name: d.name || "",
				patronymic: d.patronymic || "",
			});
			const avatar = getAvatarUrl(d);
			return { name, id: String(pid), avatar, gender: d.gender };
		};

		const recordEvent = (placeId, eventType, pid, year, role = "") => {
			if (!placeId) return;
			const cleanPId = String(placeId).trim();
			if (!cleanPId) return;

			if (visibleIds && pid && !visibleIds.has(String(pid))) return;

			const geo = resolvePlaceDetails(cleanPId, year, null, null, engine);
			if (!geo || typeof geo.lat !== "number" || typeof geo.lng !== "number") {
				return;
			}

			const key = `${geo.lat.toFixed(5)}_${geo.lng.toFixed(5)}`;
			if (!this.placesData.has(key)) {
				this.placesData.set(key, {
					key,
					placeId: cleanPId,
					name: geo.nameCurrent || cleanPId,
					nameHist: geo.nameHist || "",
					status: geo.status,
					statusText: geo.statusText,
					lat: geo.lat,
					lng: geo.lng,
					events: {
						birth: 0,
						marriage: 0,
						death: 0,
						domicile: 0,
					},
					people: [],
				});
			}

			const placeEntry = this.placesData.get(key);
			if (placeEntry.events[eventType] !== undefined) {
				placeEntry.events[eventType]++;
			}

			const person = pid ? getPersonInfo(pid) : null;
			placeEntry.people.push({
				eventType,
				pid: person ? person.id : null,
				name: person ? person.name : "Невідомо",
				year: year ? String(year) : "",
				role: role || "",
			});
		};

		// 1. Births
		const birthList = Array.isArray(db.birth) ? db.birth : (Array.isArray(db.db?.birth) ? db.db.birth : []);
		birthList.forEach((b) => {
			const pid = b[COLUMNS.birth?.personId || "person_id"] || b.person_id || b.pid;
			const placeId = b[COLUMNS.birth?.placeId || "place_id"] || b.place_id;
			const year = b[COLUMNS.birth?.year || "b_year"] || b.b_year || b.year;
			recordEvent(placeId, "birth", pid, year, "Народження");
		});

		// 2. Marriages
		const marriageList = Array.isArray(db.marriage) ? db.marriage : (Array.isArray(db.db?.marriage) ? db.db.marriage : []);
		marriageList.forEach((m) => {
			const p1 = m[COLUMNS.marriage?.personId || "person_id"] || m.person_id || m.pid;
			const p2 = m[COLUMNS.marriage?.spouseId || "spouse_id"] || m.spouse_id;
			const placeId = m[COLUMNS.marriage?.placeId || "place_id"] || m.place_id;
			const year = m[COLUMNS.marriage?.year || "m_year"] || m.m_year || m.year;
			if (p1) recordEvent(placeId, "marriage", p1, year, "Шлюб");
			if (p2) recordEvent(placeId, "marriage", p2, year, "Шлюб");
		});

		// 3. Deaths
		const deathList = Array.isArray(db.death) ? db.death : (Array.isArray(db.db?.death) ? db.db.death : []);
		deathList.forEach((d) => {
			const pid = d[COLUMNS.death?.personId || "person_id"] || d.person_id || d.pid;
			const placeId = d[COLUMNS.death?.placeId || "place_id"] || d.place_id;
			const year = d[COLUMNS.death?.year || "d_year"] || d.d_year || d.year;
			recordEvent(placeId, "death", pid, year, "Смерть");
		});

		// 4. Domicile
		const domicileList = Array.isArray(db.domicile) ? db.domicile : (Array.isArray(db.db?.domicile) ? db.db.domicile : []);
		domicileList.forEach((dom) => {
			const pid = dom.person_id || dom.pid;
			const placeId = dom.settlement || dom.region || dom.place_id;
			const year = dom.period || "";
			recordEvent(placeId, "domicile", pid, year, "Проживання");
		});

		this._updateBadges();
	}

	_updateBadges() {
		let total = 0;
		let birth = 0;
		let marriage = 0;
		let death = 0;
		let domicile = 0;

		for (const p of this.placesData.values()) {
			total += (p.people.length > 0 ? 1 : 0);
			if (p.events.birth > 0) birth++;
			if (p.events.marriage > 0) marriage++;
			if (p.events.death > 0) death++;
			if (p.events.domicile > 0) domicile++;
		}

		const setTxt = (id, count) => {
			const el = document.getElementById(id);
			if (el) el.textContent = String(count);
		};

		setTxt("map-badge-all", total);
		setTxt("map-badge-birth", birth);
		setTxt("map-badge-marriage", marriage);
		setTxt("map-badge-death", death);
		setTxt("map-badge-domicile", domicile);
	}

	_renderMarkers() {
		if (!this.mapInstance || !this.markersLayer) return;

		this.markersLayer.clearLayers();

		const bounds = L.latLngBounds([]);

		for (const place of this.placesData.values()) {
			let relevantCount = 0;
			let pinClass = "pin-mixed";

			if (this.currentFilter === "all") {
				relevantCount = place.people.length;
				if (place.events.birth > 0 && !place.events.marriage && !place.events.death) pinClass = "pin-birth";
				else if (place.events.marriage > 0 && !place.events.birth && !place.events.death) pinClass = "pin-marriage";
				else if (place.events.death > 0 && !place.events.birth && !place.events.marriage) pinClass = "pin-death";
			} else {
				relevantCount = place.events[this.currentFilter] || 0;
				if (this.currentFilter === "birth") pinClass = "pin-birth";
				if (this.currentFilter === "marriage") pinClass = "pin-marriage";
				if (this.currentFilter === "death") pinClass = "pin-death";
				if (this.currentFilter === "domicile") pinClass = "pin-mixed";
			}

			if (relevantCount === 0) continue;

			const size = Math.min(48, Math.max(28, 24 + Math.log2(relevantCount + 1) * 6));
			const icon = L.divIcon({
				className: "geneo-marker-wrapper",
				html: `
					<div class="geneo-map-pin ${pinClass}" style="width: ${size}px; height: ${size}px;" title="${escapeHtml(place.name)} (${relevantCount})">
						<span>${relevantCount}</span>
					</div>
				`,
				iconSize: [size, size],
				iconAnchor: [size / 2, size / 2],
				popupAnchor: [0, -size / 2],
			});

			const marker = L.marker([place.lat, place.lng], { icon });

			// Popup HTML
			const popupHtml = this._buildPopupHtml(place);
			marker.bindPopup(popupHtml, {
				maxWidth: 320,
				autoPan: true,
				className: "geneo-custom-popup",
			});

			this.markersLayer.addLayer(marker);
			bounds.extend([place.lat, place.lng]);
		}

		this._lastBounds = bounds.isValid() ? bounds : null;
	}

	_renderPersonItemHtml(item) {
		const getEventIcon = (type) => {
			if (type === "birth") return '<i class="ri-user-smile-line" style="color: #10b981;"></i>';
			if (type === "marriage") return '<i class="ri-heart-line" style="color: #ec4899;"></i>';
			if (type === "death") return '<i class="ri-hourglass-line" style="color: #64748b;"></i>';
			return '<i class="ri-home-2-line" style="color: #3b82f6;"></i>';
		};

		return `
			<div class="map-popup-person-item js-popup-person-btn" data-id="${item.pid || ""}">
				<span class="map-popup-person-name">${getEventIcon(item.eventType)} ${escapeHtml(item.name)}</span>
				<span class="map-popup-person-event">${escapeHtml(item.year || item.role)}</span>
			</div>
		`;
	}

	_buildPopupHtml(place) {
		const histNameSuffix = place.nameHist && place.nameHist !== place.name ? ` (${escapeHtml(place.nameHist)})` : "";
		const statusSuffix = place.statusText && place.status !== "active" ? ` <span class="map-popup-badge">${escapeHtml(place.statusText)}</span>` : "";

		// Filter people list based on active filter
		let peopleList = place.people;
		if (this.currentFilter !== "all") {
			peopleList = peopleList.filter((p) => p.eventType === this.currentFilter);
		}

		// Sort by year
		peopleList.sort((a, b) => (parseInt(a.year, 10) || 0) - (parseInt(b.year, 10) || 0));

		const initialLimit = 25;
		const displayList = peopleList.slice(0, initialLimit);
		const remaining = peopleList.length - initialLimit;

		return `
			<div class="map-popup-card" data-key="${escapeHtml(place.key)}">
				<div class="map-popup-header">
					<h3 class="map-popup-title">${escapeHtml(place.name)}${histNameSuffix}${statusSuffix}</h3>
					<div class="map-popup-badges">
						<span class="map-popup-badge">🟢 Народжень: ${place.events.birth}</span>
						<span class="map-popup-badge">💖 Шлюбів: ${place.events.marriage}</span>
						<span class="map-popup-badge">⏳ Смертей: ${place.events.death}</span>
					</div>
				</div>

				<div class="map-popup-body">
					<div class="map-popup-section-title">Особи та події (${peopleList.length})</div>
					<div class="map-popup-people-list js-popup-people-list">
						${displayList.map((item) => this._renderPersonItemHtml(item)).join("")}
					</div>
					${remaining > 0 ? `
						<div class="map-popup-load-actions js-popup-load-actions">
							<button type="button" class="map-popup-load-btn js-load-more-people" data-key="${escapeHtml(place.key)}" data-offset="${initialLimit}">
								<i class="ri-arrow-down-s-line"></i> Показати ще (+25) <span class="badge">${remaining}</span>
							</button>
							<button type="button" class="map-popup-load-btn secondary js-load-all-people" data-key="${escapeHtml(place.key)}">
								Показати всіх (${peopleList.length})
							</button>
						</div>
					` : ""}
				</div>
			</div>
		`;
	}

	fitAllBounds() {
		if (this.mapInstance && this._lastBounds) {
			this.mapInstance.fitBounds(this._lastBounds, { padding: [50, 50], maxZoom: 12 });
		}
	}

	render() {
		if (!this.engine && window.app?.engine) {
			this.engine = window.app.engine;
		}
		this.initMap();
		this.aggregatePlaces();
		this._renderMarkers();

		// Leaflet requires invalidating size after becoming visible
		requestAnimationFrame(() => {
			if (this.mapInstance) {
				this.mapInstance.invalidateSize();
				this.fitAllBounds();
			}
		});

		// Delegate clicks in popups
		if (!this._popupClickListenerAttached && this.container) {
			this.container.addEventListener("click", (e) => {
				// 1. Person card click
				const item = e.target.closest(".js-popup-person-btn");
				if (item) {
					const pid = item.getAttribute("data-id");
					if (pid && window.app?.managers?.personPopup) {
						const engine = this.engine || window.app?.engine;
						const personData = findPersonDetails(pid, engine);
						window.app.managers.personPopup.open(personData || pid);
					}
					return;
				}

				// 2. Load more (+25) click
				const btnMore = e.target.closest(".js-load-more-people");
				if (btnMore) {
					const key = btnMore.getAttribute("data-key");
					const offset = parseInt(btnMore.getAttribute("data-offset"), 10) || 0;
					const place = this.placesData.get(key);
					if (!place) return;

					let peopleList = place.people;
					if (this.currentFilter !== "all") {
						peopleList = peopleList.filter((p) => p.eventType === this.currentFilter);
					}
					peopleList.sort((a, b) => (parseInt(a.year, 10) || 0) - (parseInt(b.year, 10) || 0));

					const batch = 25;
					const nextItems = peopleList.slice(offset, offset + batch);
					const card = btnMore.closest(".map-popup-card");
					const listEl = card?.querySelector(".js-popup-people-list");
					if (listEl) {
						const fragment = nextItems.map((it) => this._renderPersonItemHtml(it)).join("");
						listEl.insertAdjacentHTML("beforeend", fragment);
					}

					const newOffset = offset + nextItems.length;
					const remaining = peopleList.length - newOffset;
					if (remaining > 0) {
						btnMore.setAttribute("data-offset", String(newOffset));
						const badge = btnMore.querySelector(".badge");
						if (badge) badge.textContent = String(remaining);
					} else {
						btnMore.closest(".js-popup-load-actions")?.remove();
					}
					return;
				}

				// 3. Load all people click
				const btnAll = e.target.closest(".js-load-all-people");
				if (btnAll) {
					const key = btnAll.getAttribute("data-key");
					const place = this.placesData.get(key);
					if (!place) return;

					let peopleList = place.people;
					if (this.currentFilter !== "all") {
						peopleList = peopleList.filter((p) => p.eventType === this.currentFilter);
					}
					peopleList.sort((a, b) => (parseInt(a.year, 10) || 0) - (parseInt(b.year, 10) || 0));

					const card = btnAll.closest(".map-popup-card");
					const listEl = card?.querySelector(".js-popup-people-list");
					const btnMore = card?.querySelector(".js-load-more-people");
					const offset = btnMore ? (parseInt(btnMore.getAttribute("data-offset"), 10) || 25) : 25;

					const remainingItems = peopleList.slice(offset);
					if (listEl && remainingItems.length > 0) {
						const fragment = remainingItems.map((it) => this._renderPersonItemHtml(it)).join("");
						listEl.insertAdjacentHTML("beforeend", fragment);
					}
					btnAll.closest(".js-popup-load-actions")?.remove();
					return;
				}
			});
			this._popupClickListenerAttached = true;
		}
	}
}
