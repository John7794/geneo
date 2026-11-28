// ./scripts/utils/mapTileUtils.js

export const MAP_TILES = {
	light: {
		url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
		attribution: 'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a>',
		maxZoom: 18,
		maxNativeZoom: 18,
	},
	dark: {
		url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
		attribution: 'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a>',
		// Esri World_Dark_Gray_Base caps tile coverage at zoom 16 ("Map data not yet available" at z >= 17)
		maxZoom: 16,
		maxNativeZoom: 16,
	},
};

/**
 * Returns tile server settings matching the current light/dark UI theme.
 */
export function getMapTileConfig() {
	const isDark = document.documentElement.classList.contains("theme-dark");
	return isDark ? MAP_TILES.dark : MAP_TILES.light;
}

/**
 * Updates Leaflet map zoom limit, tile layer options, and tile URL for the active theme.
 */
export function syncMapThemeTiles(mapInstance, tileLayer) {
	if (!mapInstance || !tileLayer) return;

	const tileConfig = getMapTileConfig();

	// Clamp zoom synchronously before swapping URLs so dark zoom >= 17 tiles are never requested
	if (mapInstance.getZoom() > tileConfig.maxZoom) {
		mapInstance.setZoom(tileConfig.maxZoom, { animate: false });
	}

	tileLayer.options.maxZoom = tileConfig.maxZoom;
	tileLayer.options.maxNativeZoom = tileConfig.maxNativeZoom;
	mapInstance.setMaxZoom(tileConfig.maxZoom);
	tileLayer.setUrl(tileConfig.url);
}
