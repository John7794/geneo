// ./scripts/components/ui/profile/lifePathMap.js

import L from "leaflet";
import { resolvePlaceDetails } from "../../../utils/geoUtils.js";
import { escapeHtml } from "../../../utils/helpers.js";

/**
 * Генерує блок інтерактивної мапи життєвого шляху персони
 */
export function renderLifePathHtml(personData, engine) {
	if (!personData) return "";

	const milestones = [];

	// 1. Birth
	if (personData.birth?.placeId || personData.birth?.place) {
		const pId = personData.birth.placeId || personData.birth.place;
		const y = personData.birth.year || personData.birth.date || "";
		const geo = resolvePlaceDetails(pId, y, null, null, engine);
		if (geo && typeof geo.lat === "number" && typeof geo.lng === "number") {
			milestones.push({
				type: "birth",
				label: "Народження",
				title: geo.nameCurrent || pId,
				year: y,
				lat: geo.lat,
				lng: geo.lng,
				color: "#10b981",
				icon: "ri-user-smile-line",
			});
		}
	}

	// 2. Marriages
	if (Array.isArray(personData.marriages)) {
		personData.marriages.forEach((m, idx) => {
			const pId = m.placeId || m.place;
			if (!pId) return;
			const y = m.year || m.date || "";
			const geo = resolvePlaceDetails(pId, y, null, null, engine);
			if (geo && typeof geo.lat === "number" && typeof geo.lng === "number") {
				milestones.push({
					type: "marriage",
					label: `Шлюб ${personData.marriages.length > 1 ? `#${idx + 1}` : ""}`,
					title: geo.nameCurrent || pId,
					year: y,
					lat: geo.lat,
					lng: geo.lng,
					color: "#ec4899",
					icon: "ri-heart-line",
					detail: m.spouseName || "",
				});
			}
		});
	}

	// 3. Domicile
	if (Array.isArray(personData.domicile)) {
		personData.domicile.forEach((dom) => {
			const pId = dom.settlement || dom.region || dom.place_id;
			if (!pId) return;
			const y = dom.period || "";
			const geo = resolvePlaceDetails(pId, y, null, null, engine);
			if (geo && typeof geo.lat === "number" && typeof geo.lng === "number") {
				milestones.push({
					type: "domicile",
					label: "Проживання",
					title: geo.nameCurrent || pId,
					year: y,
					lat: geo.lat,
					lng: geo.lng,
					color: "#3b82f6",
					icon: "ri-home-2-line",
				});
			}
		});
	}

	// 4. Death
	if (personData.death?.placeId || personData.death?.place) {
		const pId = personData.death.placeId || personData.death.place;
		const y = personData.death.year || personData.death.date || "";
		const geo = resolvePlaceDetails(pId, y, null, null, engine);
		if (geo && typeof geo.lat === "number" && typeof geo.lng === "number") {
			milestones.push({
				type: "death",
				label: "Смерть",
				title: geo.nameCurrent || pId,
				year: y,
				lat: geo.lat,
				lng: geo.lng,
				color: "#64748b",
				icon: "ri-hourglass-line",
			});
		}
	}

	if (milestones.length === 0) {
		return "";
	}

	// Store milestones in a data attribute to initialize Leaflet post-render
	const encodedData = encodeURIComponent(JSON.stringify(milestones));

	return `
		<section class="profile-block profile-lifepath-card js-lifepath-card" data-milestones="${encodedData}">
			<div class="profile-lifepath-header">
				<h3 class="profile-lifepath-title">
					<i class="ri-road-map-line" style="color: var(--color-primary);"></i> Географія життя (${milestones.length} ${milestones.length === 1 ? "локація" : "локації"})
				</h3>
			</div>

			<div class="profile-lifepath-map-container" id="profile-lifepath-map"></div>

			<div class="profile-lifepath-timeline">
				${milestones.map((m, idx) => `
					<div class="profile-lifepath-step">
						<div class="profile-lifepath-marker" style="background: ${m.color};">
							${idx + 1}
						</div>
						<div class="profile-lifepath-step-content" style="flex: 1;">
							<div style="display: flex; align-items: baseline; justify-content: space-between;">
								<strong style="font-size: 14px; color: var(--color-text-main);">${escapeHtml(m.label)}: ${escapeHtml(m.title)}</strong>
								${m.year ? `<span style="font-size: 12px; color: var(--color-text-muted); font-weight: 600;">${escapeHtml(m.year)}</span>` : ""}
							</div>
							${m.detail ? `<div style="font-size: 12px; color: var(--color-text-muted);">${escapeHtml(m.detail)}</div>` : ""}
						</div>
					</div>
				`).join("")}
			</div>
		</section>
	`;
}

/**
 * Ініціалізує міні-мапу в DOM після вставки HTML профілю
 */
export function initProfileLifePathMap(containerEl) {
	if (!containerEl) return;

	const card = containerEl.querySelector(".js-lifepath-card");
	if (!card) return;

	const mapEl = card.querySelector("#profile-lifepath-map");
	if (!mapEl || mapEl._leaflet_id) return;

	const rawData = card.getAttribute("data-milestones");
	if (!rawData) return;

	let milestones = [];
	try {
		milestones = JSON.parse(decodeURIComponent(rawData));
	} catch (e) {
		return;
	}

	if (!milestones.length) return;

	const isDark = document.documentElement.classList.contains("theme-dark");
	const tileUrl = isDark
		? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
		: "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

	const map = L.map(mapEl, {
		zoomControl: false,
		attributionControl: false,
		scrollWheelZoom: false,
	});

	L.control.zoom({ position: "bottomright" }).addTo(map);

	L.tileLayer(tileUrl, { maxZoom: 18, subdomains: "abcd" }).addTo(map);

	const latLngs = [];
	const bounds = L.latLngBounds([]);

	milestones.forEach((m, idx) => {
		const coord = [m.lat, m.lng];
		latLngs.push(coord);
		bounds.extend(coord);

		const icon = L.divIcon({
			className: "geneo-marker-wrapper",
			html: `
				<div class="geneo-map-pin" style="background: ${m.color}; width: 28px; height: 28px; font-size: 12px;">
					${idx + 1}
				</div>
			`,
			iconSize: [28, 28],
			iconAnchor: [14, 14],
		});

		L.marker(coord, { icon })
			.bindPopup(`<strong>${escapeHtml(m.label)}</strong><br>${escapeHtml(m.title)} ${m.year ? `(${escapeHtml(m.year)})` : ""}`)
			.addTo(map);
	});

	// Draw connecting route line if more than 1 point
	if (latLngs.length > 1) {
		L.polyline(latLngs, {
			color: "var(--color-primary, #2563eb)",
			weight: 3,
			dashArray: "6, 8",
			opacity: 0.8,
		}).addTo(map);
	}

	if (bounds.isValid()) {
		map.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
	} else if (latLngs.length === 1) {
		map.setView(latLngs[0], 10);
	}

	requestAnimationFrame(() => {
		map.invalidateSize();
	});
}
