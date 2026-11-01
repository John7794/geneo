// ./scripts/services/googleDriveService.js

/**
 * Сервіс взаємодії з Google Drive API (BYOS - Bring Your Own Storage)
 * Відповідає за:
 * - Авторизацію OAuth2 (drive.file)
 * - Перевірку доступного місця та квот
 * - Автоматичне розгортання структури тек Geneo (db/ та records/...)
 * - Синхронізацію таблиць бази даних
 * - Завантаження архівних документів та фотографій у відповідні підпапки
 */

const DRIVE_API_URL = "https://www.googleapis.com/drive/v3";
const UPLOAD_API_URL = "https://www.googleapis.com/upload/drive/v3";
const OAUTH_SCOPE = "https://www.googleapis.com/auth/drive.file";

const STORAGE_KEYS = {
	ACCESS_TOKEN: "geneo_gdrive_token",
	TOKEN_EXPIRES: "geneo_gdrive_expires",
	FOLDER_MAP: "geneo_gdrive_folder_map",
	USER_INFO: "geneo_gdrive_user",
	CLIENT_ID: "geneo_gdrive_client_id",
};

// За замовчуванням клієнтський ID платформи або користувацький
const DEFAULT_CLIENT_ID = "241221120342-u8q5h1l4tceg71lq8s128knk5bqu61j8.apps.googleusercontent.com";

export class GoogleDriveService {
	constructor() {
		this.accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || null;
		this.tokenExpiresAt = parseInt(localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES) || "0", 10);
		this.clientId = localStorage.getItem(STORAGE_KEYS.CLIENT_ID) || DEFAULT_CLIENT_ID;
		this.folderMap = this._loadFolderMap();
		this.userInfo = this._loadUserInfo();
		this.tokenClient = null;
		this.listeners = [];
	}

	_loadFolderMap() {
		try {
			const raw = localStorage.getItem(STORAGE_KEYS.FOLDER_MAP);
			return raw ? JSON.parse(raw) : null;
		} catch (e) {
			return null;
		}
	}

	_saveFolderMap(map) {
		this.folderMap = map;
		try {
			localStorage.setItem(STORAGE_KEYS.FOLDER_MAP, JSON.stringify(map));
		} catch (e) {}
	}

	getFolderMap() {
		return this.folderMap;
	}

	_loadUserInfo() {
		try {
			const raw = localStorage.getItem(STORAGE_KEYS.USER_INFO);
			return raw ? JSON.parse(raw) : null;
		} catch (e) {
			return null;
		}
	}

	getUserInfo() {
		return this.userInfo;
	}

	_saveUserInfo(info) {
		this.userInfo = info;
		try {
			localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(info));
		} catch (e) {}
	}

	setClientId(clientId) {
		if (clientId && clientId.trim()) {
			this.clientId = clientId.trim();
			localStorage.setItem(STORAGE_KEYS.CLIENT_ID, this.clientId);
			this._setupTokenClient();
		}
	}

	getClientId() {
		return this.clientId;
	}

	isConnected() {
		return !!(this.accessToken && Date.now() < this.tokenExpiresAt);
	}

	/**
	 * Ініціалізація Google Identity Services
	 */
	async initGis() {
		return new Promise((resolve) => {
			if (window.google?.accounts?.oauth2) {
				this._setupTokenClient();
				resolve(true);
				return;
			}

			// Динамічне підключення скрипта Google Identity Services
			if (!document.getElementById("google-gis-script")) {
				const script = document.createElement("script");
				script.id = "google-gis-script";
				script.src = "https://accounts.google.com/gsi/client";
				script.async = true;
				script.defer = true;
				script.onload = () => {
					this._setupTokenClient();
					resolve(true);
				};
				script.onerror = () => {
					console.warn("Не вдалося завантажити Google Identity Services.");
					resolve(false);
				};
				document.head.appendChild(script);
			} else {
				resolve(false);
			}
		});
	}

	_setupTokenClient() {
		if (!window.google?.accounts?.oauth2) return;
		try {
			this.tokenClient = window.google.accounts.oauth2.initTokenClient({
				client_id: this.clientId,
				scope: OAUTH_SCOPE,
				callback: (tokenResponse) => {
					if (tokenResponse && tokenResponse.access_token) {
						this.accessToken = tokenResponse.access_token;
						const expiresInSec = tokenResponse.expires_in || 3600;
						this.tokenExpiresAt = Date.now() + expiresInSec * 1000;
						localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, this.accessToken);
						localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES, String(this.tokenExpiresAt));

						this.getQuota().then((quota) => {
							if (quota?.user) {
								this._saveUserInfo(quota.user);
							}
							this._notifyListeners("connected");
						});
					}
				},
			});
		} catch (e) {
			console.warn("Помилка створення tokenClient:", e);
		}
	}

	/**
	 * Авторизація користувача через Google OAuth
	 */
	async requestAccess() {
		await this.initGis();
		if (!this.tokenClient) {
			this._setupTokenClient();
		}
		if (this.tokenClient) {
			this.tokenClient.requestAccessToken({ prompt: "consent" });
		} else {
			throw new Error("Google Identity Services недоступний. Перевірте з'єднання або налаштування блокувальника реклами.");
		}
	}

	/**
	 * Ручне встановлення токена (наприклад, для тестування або сервера)
	 */
	setAccessToken(token, expiresIn = 3600) {
		this.accessToken = token;
		this.tokenExpiresAt = Date.now() + expiresIn * 1000;
		localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
		localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES, String(this.tokenExpiresAt));
		this._notifyListeners("connected");
	}

	/**
	 * Відключення Google Диску
	 */
	disconnect() {
		if (this.accessToken && typeof window !== "undefined" && window.google?.accounts?.oauth2?.revoke) {
			try {
				window.google.accounts.oauth2.revoke(this.accessToken, () => {});
			} catch (e) {}
		}

		this.accessToken = null;
		this.tokenExpiresAt = 0;
		this.folderMap = null;
		this.userInfo = null;
		localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
		localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES);
		localStorage.removeItem(STORAGE_KEYS.FOLDER_MAP);
		localStorage.removeItem(STORAGE_KEYS.USER_INFO);

		this._notifyListeners("disconnected");
	}

	/**
	 * Запит до Google Drive REST API
	 */
	async apiRequest(endpoint, options = {}) {
		if (!this.isConnected()) {
			throw new Error("Google Диск не підключено або закінчився термін дії токена.");
		}

		// Локальна обробка та емуляція для роботи без блокувань з боку Google
		if (this.accessToken && (this.accessToken.startsWith("gdrive_") || this.accessToken.startsWith("demo_"))) {
			await new Promise((r) => setTimeout(r, 60));
			if (endpoint.includes("/about")) {
				return {
					storageQuota: {
						limit: String(15 * 1024 * 1024 * 1024),
						usage: String(2.1 * 1024 * 1024 * 1024),
						usageInDrive: String(0.85 * 1024 * 1024 * 1024),
					},
					user: this.userInfo || {
						displayName: "Користувач Google",
						emailAddress: "my-drive@gmail.com",
					},
				};
			}
			if (endpoint.includes("/files")) {
				if (options.method === "POST") {
					const body = JSON.parse(options.body || "{}");
					return { id: `folder_${body.name || "item"}_${Date.now()}`, name: body.name };
				}
				return { files: [] };
			}
			return {};
		}

		const url = endpoint.startsWith("http") ? endpoint : `${DRIVE_API_URL}${endpoint}`;
		const headers = {
			Authorization: `Bearer ${this.accessToken}`,
			...options.headers,
		};

		const res = await fetch(url, { ...options, headers });
		if (res.status === 401) {
			this.disconnect();
			throw new Error("Сесія Google закінчилася. Будь ласка, авторизуйтесь знову.");
		}
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.error?.message || `Помилка Google Drive API: ${res.status}`);
		}
		return res.json();
	}

	/**
	 * Перевірка квоти та вільного місця
	 */
	async getQuota() {
		try {
			const data = await this.apiRequest("/about?fields=storageQuota,user");
			const quota = data.storageQuota || {};
			const limit = parseInt(quota.limit || "0", 10);
			const usage = parseInt(quota.usage || "0", 10);
			const usageInDrive = parseInt(quota.usageInDrive || "0", 10);
			const freeBytes = limit > 0 ? Math.max(0, limit - usage) : 0;
			const percentUsed = limit > 0 ? ((usage / limit) * 100).toFixed(1) : 0;

			const result = {
				user: data.user
					? {
							name: data.user.displayName,
							email: data.user.emailAddress,
							photo: data.user.photoLink,
						}
					: null,
				limitBytes: limit,
				usageBytes: usage,
				usageInDriveBytes: usageInDrive,
				freeBytes: freeBytes,
				percentUsed: parseFloat(percentUsed),
				isLowSpace: limit > 0 && freeBytes < 500 * 1024 * 1024, // менше 500 MB
			};

			if (result.user) this._saveUserInfo(result.user);
			return result;
		} catch (e) {
			console.warn("Помилка отримання квоти Google Drive:", e);
			return null;
		}
	}

	/**
	 * Отримати або створити папку за назвою та батьківським каталогом
	 */
	async getOrCreateFolder(name, parentId = null) {
		const parentQuery = parentId ? `'${parentId}' in parents` : "'root' in parents";
		const q = `name = '${name.replace(/'/g, "\\'")}' and ${parentQuery} and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

		const res = await this.apiRequest(`/files?q=${encodeURIComponent(q)}&fields=files(id,name)`);
		if (res.files && res.files.length > 0) {
			return res.files[0].id;
		}

		// Створюємо нову папку
		const meta = {
			name: name,
			mimeType: "application/vnd.google-apps.folder",
			parents: parentId ? [parentId] : undefined,
		};

		const created = await this.apiRequest("/files?fields=id,name", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(meta),
		});

		return created.id;
	}

	/**
	 * Автоматичне розгортання повної ієрархії тек Geneo
	 * Geneo/
	 * ├── db/
	 * │   └── uk/
	 * └── records/
	 *     ├── family_photos/
	 *     ├── portraits/
	 *     └── scans/
	 *         ├── awards/
	 *         │   ├── medals/
	 *         │   └── records/
	 *         ├── confessions/
	 *         ├── metrics/
	 *         │   ├── birth/
	 *         │   ├── marriage/
	 *         │   └── death/
	 *         └── military/
	 */
	async ensureFolderHierarchy(onProgress = null) {
		const step = (msg, pct) => {
			if (typeof onProgress === "function") onProgress(msg, pct);
		};

		step("Створення кореневої теки Geneo...", 10);
		const rootId = await this.getOrCreateFolder("Geneo");

		step("Створення каталогу баз даних Geneo/db/uk/...", 25);
		const dbId = await this.getOrCreateFolder("db", rootId);
		const dbUkId = await this.getOrCreateFolder("uk", dbId);

		step("Створення каталогу архівних документів Geneo/records/...", 40);
		const recordsId = await this.getOrCreateFolder("records", rootId);
		const familyPhotosId = await this.getOrCreateFolder("family_photos", recordsId);
		const portraitsId = await this.getOrCreateFolder("portraits", recordsId);

		step("Створення каталогів сканів та нагород...", 60);
		const scansId = await this.getOrCreateFolder("scans", recordsId);

		const awardsId = await this.getOrCreateFolder("awards", scansId);
		const awardsMedalsId = await this.getOrCreateFolder("medals", awardsId);
		const awardsRecordsId = await this.getOrCreateFolder("records", awardsId);

		step("Створення каталогів метрик, сповідей та військових записів...", 80);
		const confessionsId = await this.getOrCreateFolder("confessions", scansId);

		const metricsId = await this.getOrCreateFolder("metrics", scansId);
		const metricsBirthId = await this.getOrCreateFolder("birth", metricsId);
		const metricsMarriageId = await this.getOrCreateFolder("marriage", metricsId);
		const metricsDeathId = await this.getOrCreateFolder("death", metricsId);

		const militaryId = await this.getOrCreateFolder("military", scansId);

		step("Завершення налаштування структури...", 100);

		const map = {
			root: rootId,
			db: dbId,
			dbUk: dbUkId,
			records: recordsId,
			familyPhotos: familyPhotosId,
			portraits: portraitsId,
			scans: scansId,
			awards: awardsId,
			awardsMedals: awardsMedalsId,
			awardsRecords: awardsRecordsId,
			confessions: confessionsId,
			metrics: metricsId,
			metricsBirth: metricsBirthId,
			metricsMarriage: metricsMarriageId,
			metricsDeath: metricsDeathId,
			military: militaryId,
			provisionedAt: Date.now(),
		};

		this._saveFolderMap(map);
		return map;
	}

	/**
	 * Завантаження файлу в зазначену папку на Google Диску
	 */
	async uploadFile({ name, mimeType = "text/plain", content, folderId }) {
		if (!this.isConnected()) {
			throw new Error("Google Диск не підключено.");
		}

		if (this.accessToken && (this.accessToken.startsWith("gdrive_") || this.accessToken.startsWith("demo_"))) {
			await new Promise((r) => setTimeout(r, 60));
			return {
				id: `file_${name.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`,
				name: name,
				webViewLink: `https://drive.google.com/drive/u/0/my-drive`,
			};
		}

		// Перевірка чи файл з таким іменем вже існує у цій папці
		const q = `name = '${name.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed = false`;
		const searchRes = await this.apiRequest(`/files?q=${encodeURIComponent(q)}&fields=files(id)`);
		const existingFileId = searchRes.files?.[0]?.id;

		const boundary = "-------314159265358979323846";
		const delimiter = `\r\n--${boundary}\r\n`;
		const closeDelimiter = `\r\n--${boundary}--`;

		const metadata = {
			name: name,
			mimeType: mimeType,
			parents: existingFileId ? undefined : [folderId],
		};

		let multipartRequestBody = "";
		multipartRequestBody += delimiter;
		multipartRequestBody += "Content-Type: application/json; charset=UTF-8\r\n\r\n";
		multipartRequestBody += JSON.stringify(metadata);
		multipartRequestBody += delimiter;
		multipartRequestBody += `Content-Type: ${mimeType}\r\n\r\n`;

		let bodyPayload;
		if (content instanceof Blob) {
			const metaBlob = new Blob([multipartRequestBody], { type: "text/plain" });
			const endBlob = new Blob([closeDelimiter], { type: "text/plain" });
			bodyPayload = new Blob([metaBlob, content, endBlob], { type: `multipart/related; boundary=${boundary}` });
		} else {
			bodyPayload = multipartRequestBody + (typeof content === "string" ? content : JSON.stringify(content)) + closeDelimiter;
		}

		const uploadUrl = existingFileId
			? `${UPLOAD_API_URL}/files/${existingFileId}?uploadType=multipart&fields=id,name,webViewLink,webContentLink,thumbnailLink`
			: `${UPLOAD_API_URL}/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,thumbnailLink`;

		const res = await fetch(uploadUrl, {
			method: existingFileId ? "PATCH" : "POST",
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
				"Content-Type": `multipart/related; boundary=${boundary}`,
			},
			body: bodyPayload,
		});

		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.error?.message || `Помилка завантаження файлу ${name}: ${res.status}`);
		}

		return res.json();
	}

	/**
	 * Розумна маршрутизація та завантаження медіафайлу у відповідну підпапку
	 * @param {Object} params
	 * @param {File|Blob} params.file
	 * @param {string} params.category - portrait | family_photo | medal | award_record | confession | metric_birth | metric_marriage | metric_death | military
	 * @param {string} params.entityId - ID персони або сім'ї
	 * @param {string} [params.customName]
	 */
	async uploadMedia({ file, category, entityId, customName = "" }) {
		if (!this.folderMap) {
			await this.ensureFolderHierarchy();
		}

		let targetFolderId = this.folderMap.records;
		let finalFileName = customName || file.name || `file_${Date.now()}`;
		const ext = finalFileName.includes(".") ? finalFileName.split(".").pop() : "jpg";

		switch (category) {
			case "portrait":
				targetFolderId = this.folderMap.portraits;
				finalFileName = `${entityId}.${ext}`;
				break;

			case "family_photo":
				// Створюємо або знаходимо папку для сім'ї
				targetFolderId = await this.getOrCreateFolder(String(entityId), this.folderMap.familyPhotos);
				break;

			case "medal":
				targetFolderId = await this.getOrCreateFolder(String(entityId), this.folderMap.awardsMedals);
				break;

			case "award_record":
				targetFolderId = await this.getOrCreateFolder(String(entityId), this.folderMap.awardsRecords);
				break;

			case "confession":
				targetFolderId = this.folderMap.confessions;
				break;

			case "metric_birth":
				targetFolderId = this.folderMap.metricsBirth;
				break;

			case "metric_marriage":
				targetFolderId = this.folderMap.metricsMarriage;
				break;

			case "metric_death":
				targetFolderId = this.folderMap.metricsDeath;
				break;

			case "military":
				targetFolderId = this.folderMap.military;
				break;

			default:
				targetFolderId = this.folderMap.records;
				break;
		}

		const uploaded = await this.uploadFile({
			name: finalFileName,
			mimeType: file.type || "image/jpeg",
			content: file,
			folderId: targetFolderId,
		});

		return {
			...uploaded,
			category,
			entityId,
			folderId: targetFolderId,
		};
	}

	/**
	 * Синхронізація 31 таблиці бази даних активного дерева на Google Диск у Geneo/db/uk/
	 */
	async syncWorkspaceDatabaseToDrive(workspace, onProgress = null) {
		if (!workspace || !workspace.dbData) {
			throw new Error("Немає даних бази для синхронізації.");
		}

		if (!this.folderMap) {
			await this.ensureFolderHierarchy();
		}

		const db = workspace.dbData;
		const PapaUnparse = window.Papa?.unparse ? window.Papa.unparse.bind(window.Papa) : this._fallbackCsvUnparse.bind(this);

		const tables = [
			{ name: "basic.csv", data: db.basic },
			{ name: "names.csv", data: db.names },
			{ name: "families.csv", data: db.families },
			{ name: "familyChildren.csv", data: db.familyChildren },
			{ name: "familyRoles.csv", data: db.familyRoles },
			{ name: "birth.csv", data: db.birth },
			{ name: "baptism.csv", data: db.baptism },
			{ name: "marriage.csv", data: db.marriage },
			{ name: "death.csv", data: db.death },
			{ name: "funeral.csv", data: db.funeral },
			{ name: "places.csv", data: db.places },
			{ name: "records.csv", data: db.records },
			{ name: "events.csv", data: db.events },
			{ name: "participants.csv", data: db.participants },
			{ name: "awards.csv", data: db.awards },
			{ name: "military.csv", data: db.military },
			{ name: "education.csv", data: db.education },
			{ name: "job.csv", data: db.job },
			{ name: "gallery.csv", data: db.gallery },
			{ name: "familyList.csv", data: db.familyList },
			{ name: "churches.csv", data: db.churches },
			{ name: "cemeteries.csv", data: db.cemeteries },
			{ name: "coats.csv", data: db.coats },
			{ name: "archives.csv", data: db.archives },
		];

		const total = tables.length;
		let completed = 0;

		for (const table of tables) {
			if (Array.isArray(table.data) && table.data.length > 0) {
				const csvContent = PapaUnparse(table.data);
				await this.uploadFile({
					name: table.name,
					mimeType: "text/csv;charset=utf-8",
					content: csvContent,
					folderId: this.folderMap.dbUk,
				});
			}
			completed++;
			if (typeof onProgress === "function") {
				onProgress(table.name, Math.round((completed / total) * 100));
			}
		}

		// Збереження metadata.json
		const meta = {
			workspaceId: workspace.id,
			workspaceName: workspace.name,
			lastUpdated: new Date().toISOString(),
			timestamp: Date.now(),
			profileCount: workspace.stats?.persons || 0,
			familyCount: workspace.stats?.families || 0,
			syncedTablesCount: completed,
		};

		await this.uploadFile({
			name: "metadata.json",
			mimeType: "application/json",
			content: JSON.stringify(meta, null, 2),
			folderId: this.folderMap.db,
		});

		// Автоматичне вивантаження Google Apps Script для автоматизації таблиць (BYOS)
		try {
			const scriptRes = await fetch("/google-apps-script/GeneoAutoSync.gs");
			if (scriptRes.ok) {
				const scriptContent = await scriptRes.text();
				await this.uploadFile({
					name: "GeneoAutoSync.gs",
					mimeType: "text/plain;charset=utf-8",
					content: scriptContent,
					folderId: this.folderMap.db,
				});
			}
		} catch (gsErr) {
			console.warn("Не вдалося завантажити GeneoAutoSync.gs:", gsErr);
		}

		return meta;
	}

	_fallbackCsvUnparse(arr) {
		if (!Array.isArray(arr) || arr.length === 0) return "";
		const headers = Object.keys(arr[0]);
		const rows = arr.map((obj) =>
			headers
				.map((h) => {
					let val = obj[h] === null || obj[h] === undefined ? "" : String(obj[h]);
					if (val.includes(",") || val.includes('"') || val.includes("\n")) {
						val = `"${val.replace(/"/g, '""')}"`;
					}
					return val;
				})
				.join(","),
		);
		return [headers.join(","), ...rows].join("\n");
	}


	/**
	 * Отримати список папок на Google Диску
	 */
	async listGeneoFolders() {
		if (!this.isConnected()) throw new Error("Google Диск не підключено");
		if (this.accessToken && (this.accessToken.startsWith("gdrive_") || this.accessToken.startsWith("demo_"))) {
			return [
				{ id: "folder_geneo_selivanov", name: "Geneo - Родовід Селіванових", modifiedTime: new Date().toISOString() },
				{ id: "folder_geneo_custom", name: "Geneo - Мій Новий Родовід", modifiedTime: new Date().toISOString() }
			];
		}
		const q = "mimeType = 'application/vnd.google-apps.folder' and trashed = false";
		const res = await this.apiRequest(`/files?q=${encodeURIComponent(q)}&pageSize=50&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`);
		return res.files || [];
	}

	/**
	 * Валідація структури папки Geneo на Google Диску (validateDriveFolderStructure)
	 */
	async validateDriveFolderStructure(folderId) {
		if (!this.isConnected()) throw new Error("Google Диск не підключено");

		let folderName = "Папка Geneo";
		let files = [];

		if (this.accessToken && (this.accessToken.startsWith("gdrive_") || this.accessToken.startsWith("demo_"))) {
			folderName = folderId.includes("empty") ? "Порожня папка" : "Geneo - Мій Родовід";
			files = folderId.includes("empty") ? [] : [
				{ id: "f_db", name: "db", mimeType: "application/vnd.google-apps.folder" },
				{ id: "f_records", name: "records", mimeType: "application/vnd.google-apps.folder" },
			];
		} else {
			try {
				const folderMeta = await this.apiRequest(`/files/${folderId}?fields=id,name`);
				folderName = folderMeta.name || "Обрана папка";
			} catch (e) {}

			const q = `'${folderId}' in parents and trashed = false`;
			const res = await this.apiRequest(`/files?q=${encodeURIComponent(q)}&pageSize=100&fields=files(id,name,mimeType)`);
			files = res.files || [];
		}

		const isFolder = (name) => files.some((f) => f.name.toLowerCase() === name.toLowerCase() && f.mimeType === "application/vnd.google-apps.folder");
		const findFolder = (name) => files.find((f) => f.name.toLowerCase() === name.toLowerCase() && f.mimeType === "application/vnd.google-apps.folder");

		const hasDb = isFolder("db");
		const hasRecords = isFolder("records");
		const dbFolder = findFolder("db");
		const recordsFolder = findFolder("records");

		let dbFiles = [];
		let dbUkFolder = null;
		let hasBasicCsv = false;
		let hasFamiliesCsv = false;
		let hasFamilyRolesOrChildren = false;
		let hasAppsScript = false;

		if (dbFolder && !(this.accessToken && (this.accessToken.startsWith("gdrive_") || this.accessToken.startsWith("demo_")))) {
			try {
				const dbQ = `'${dbFolder.id}' in parents and trashed = false`;
				const dbRes = await this.apiRequest(`/files?q=${encodeURIComponent(dbQ)}&pageSize=100&fields=files(id,name,mimeType)`);
				dbFiles = dbRes.files || [];
				dbUkFolder = dbFiles.find((f) => f.name.toLowerCase() === "uk" && f.mimeType === "application/vnd.google-apps.folder");

				let allDbFiles = [...dbFiles];
				if (dbUkFolder) {
					const ukQ = `'${dbUkFolder.id}' in parents and trashed = false`;
					const ukRes = await this.apiRequest(`/files?q=${encodeURIComponent(ukQ)}&pageSize=100&fields=files(id,name,mimeType)`);
					allDbFiles.push(...(ukRes.files || []));
				}

				const hasUnifiedDb = allDbFiles.some((f) =>
					(f.mimeType === "application/vnd.google-apps.spreadsheet" || f.mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") &&
					(f.name.toLowerCase().includes("geneo") || f.name.toLowerCase().includes("db") || f.name.toLowerCase().includes("родовід"))
				);

				hasBasicCsv = hasUnifiedDb || allDbFiles.some((f) => f.name.toLowerCase() === "basic.csv");
				hasFamiliesCsv = hasUnifiedDb || allDbFiles.some((f) => f.name.toLowerCase() === "families.csv");
				hasFamilyRolesOrChildren = hasUnifiedDb || allDbFiles.some((f) => f.name.toLowerCase() === "familyroles.csv" || f.name.toLowerCase() === "familychildren.csv");
				hasAppsScript = allDbFiles.some((f) => f.name.toLowerCase() === "geneoautosync.gs" || f.name.toLowerCase() === "geneo_db");
			} catch (e) {}
		} else if (dbFolder) {
			hasBasicCsv = true;
			hasFamiliesCsv = true;
			hasFamilyRolesOrChildren = true;
			hasAppsScript = true;
		}

		let recordsFiles = [];
		let hasPortraits = false;
		let hasFamilyPhotos = false;
		let hasScans = false;

		if (recordsFolder && !(this.accessToken && (this.accessToken.startsWith("gdrive_") || this.accessToken.startsWith("demo_")))) {
			try {
				const recQ = `'${recordsFolder.id}' in parents and trashed = false`;
				const recRes = await this.apiRequest(`/files?q=${encodeURIComponent(recQ)}&pageSize=100&fields=files(id,name,mimeType)`);
				recordsFiles = recRes.files || [];
				hasPortraits = recordsFiles.some((f) => f.name.toLowerCase() === "portraits");
				hasFamilyPhotos = recordsFiles.some((f) => f.name.toLowerCase() === "family_photos");
				hasScans = recordsFiles.some((f) => f.name.toLowerCase() === "scans");
			} catch (e) {}
		} else if (recordsFolder) {
			hasPortraits = true;
			hasFamilyPhotos = true;
			hasScans = true;
		}

		const present = [];
		const missing = [];

		if (hasDb) present.push("Папка db/ (База даних)"); else missing.push("Папка db/ (База даних)");
		if (hasBasicCsv && hasFamiliesCsv) {
			present.push("Таблиці бази даних (Geneo_DB або basic.csv, families.csv)");
		} else {
			if (hasBasicCsv) present.push("Таблиця basic.csv (Персони)"); else missing.push("Таблиця basic.csv (Персони)");
			if (hasFamiliesCsv) present.push("Таблиця families.csv (Сім'ї)"); else missing.push("Таблиця families.csv (Сім'ї)");
		}
		if (hasFamilyRolesOrChildren) present.push("Таблиця familyChildren.csv / familyRoles.csv (Родинні зв'язки)"); else missing.push("Таблиця familyChildren.csv / familyRoles.csv (Родинні зв'язки)");
		if (hasAppsScript) present.push("Скрипт автоматизації GeneoAutoSync.gs"); else missing.push("Скрипт автоматизації GeneoAutoSync.gs");
		if (hasRecords) present.push("Папка records/ (Архівні матеріали)"); else missing.push("Папка records/ (Архівні матеріали)");
		if (hasPortraits) present.push("Підпапка records/portraits/ (Портрети)"); else missing.push("Підпапка records/portraits/ (Портрети)");
		if (hasFamilyPhotos) present.push("Підпапка records/family_photos/ (Сімейні фото)"); else missing.push("Підпапка records/family_photos/ (Сімейні фото)");
		if (hasScans) present.push("Підпапка records/scans/ (Метрики, сповідні, нагороди)"); else missing.push("Підпапка records/scans/ (Метрики, сповідні, нагороди)");

		const isValid = hasDb && hasBasicCsv && hasFamiliesCsv && hasRecords;

		return {
			isValid,
			folderId,
			folderName,
			present,
			missing,
			folderMap: {
				root: folderId,
				db: dbFolder ? dbFolder.id : null,
				dbUk: dbUkFolder ? dbUkFolder.id : (dbFolder ? dbFolder.id : null),
				records: recordsFolder ? recordsFolder.id : null,
			},
		};
	}

	/**
	 * Створення кореневої папки проєкту Geneo - [Назва родоводу] та повне розгортання структури
	 */
	async createTreeFolderAndDeploy(treeName, dbData, onProgress = null) {
		const step = (msg, pct) => {
			if (typeof onProgress === "function") onProgress(msg, pct);
		};

		const cleanTreeName = (treeName || "Новий родовід").trim().replace(/^Geneo\s*-\s*/i, "");
		const rootFolderName = `Geneo - ${cleanTreeName}`;

		step(`Створення кореневої папки "${rootFolderName}"...`, 10);
		const rootId = await this.getOrCreateFolder(rootFolderName);

		step("Розгортання структури папок db/ та records/...", 30);
		const dbId = await this.getOrCreateFolder("db", rootId);
		const dbUkId = await this.getOrCreateFolder("uk", dbId);
		const recordsId = await this.getOrCreateFolder("records", rootId);

		await this.getOrCreateFolder("portraits", recordsId);
		await this.getOrCreateFolder("family_photos", recordsId);
		const scansId = await this.getOrCreateFolder("scans", recordsId);
		await this.getOrCreateFolder("metrics", scansId);
		await this.getOrCreateFolder("confessions", scansId);
		await this.getOrCreateFolder("awards", scansId);
		await this.getOrCreateFolder("military", scansId);

		const folderMap = {
			root: rootId,
			db: dbId,
			dbUk: dbUkId,
			records: recordsId,
			provisionedAt: Date.now(),
		};

		step("Завантаження таблиць бази даних та скриптів...", 60);
		const workspaceStub = {
			id: `gdrive_${rootId}`,
			name: rootFolderName,
			dbData: dbData,
		};

		this.folderMap = folderMap;
		this._saveFolderMap(folderMap);

		await this.syncWorkspaceDatabaseToDrive(workspaceStub, (tbl, pct) => {
			step(`Синхронізація ${tbl}...`, 60 + Math.round(pct * 0.35));
		});

		step("Структуру успішно розгорнуто!", 100);

		return {
			folderId: rootId,
			folderName: rootFolderName,
			folderMap,
		};
	}

	/**
	 * Розгортання або відновлення відсутньої структури у вказаній папці
	 */
	async repairFolderStructure(folderId, onProgress = null) {
		const step = (msg, pct) => {
			if (typeof onProgress === "function") onProgress(msg, pct);
		};

		step("Створення обов'язкових папок db/ та records/...", 20);
		const dbId = await this.getOrCreateFolder("db", folderId);
		const dbUkId = await this.getOrCreateFolder("uk", dbId);
		const recordsId = await this.getOrCreateFolder("records", folderId);

		step("Створення архівних підпапок...", 50);
		await this.getOrCreateFolder("portraits", recordsId);
		await this.getOrCreateFolder("family_photos", recordsId);
		const scansId = await this.getOrCreateFolder("scans", recordsId);
		await this.getOrCreateFolder("metrics", scansId);
		await this.getOrCreateFolder("confessions", scansId);
		await this.getOrCreateFolder("awards", scansId);
		await this.getOrCreateFolder("military", scansId);

		step("Встановлення GeneoAutoSync.gs...", 80);
		try {
			const scriptRes = await fetch("/google-apps-script/GeneoAutoSync.gs");
			if (scriptRes.ok) {
				const scriptContent = await scriptRes.text();
				await this.uploadFile({
					name: "GeneoAutoSync.gs",
					mimeType: "text/plain;charset=utf-8",
					content: scriptContent,
					folderId: dbId,
				});
			}
		} catch (e) {}

		step("Структуру відновлено!", 100);

		return {
			root: folderId,
			db: dbId,
			dbUk: dbUkId,
			records: recordsId,
			provisionedAt: Date.now(),
		};
	}

	onStateChange(fn) {
		if (typeof fn === "function") this.listeners.push(fn);
	}

	_notifyListeners(event) {
		for (const fn of this.listeners) {
			try {
				fn(event, this.isConnected(), this.userInfo);
			} catch (e) {}
		}
	}
}
