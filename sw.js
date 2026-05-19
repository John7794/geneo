// ./sw.js

const CACHE_NAME = "gdrive-images-v1";

self.addEventListener("install", () => {
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
	const url = new URL(event.request.url);

	// Фільтр. Ловимо тільки запити до ескізів Гугла.
	if (
		url.hostname === "drive.google.com" &&
		url.pathname.includes("/thumbnail")
	) {
		event.respondWith(
			caches.match(event.request).then((cachedResponse) => {
				// Віддача з кешу. Мережа ігнорується.
				if (cachedResponse) return cachedResponse;

				// Завантаження нового файлу.
				return fetch(event.request)
					.then((networkResponse) => {
						if (
							!networkResponse ||
							networkResponse.status !== 200 ||
							networkResponse.type !== "cors"
						) {
							return networkResponse;
						}

						// Збереження копії у локальний архів.
						const responseToCache = networkResponse.clone();
						caches.open(CACHE_NAME).then((cache) => {
							cache.put(event.request, responseToCache);
						});

						return networkResponse;
					})
					.catch(() => console.error("Помилка завантаження ресурсу."));
			}),
		);
	}
});
