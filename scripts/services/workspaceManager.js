// ./scripts/services/workspaceManager.js

import { fetchAllData } from "../api/api.js";
import { FamilyEngine } from "./familyEngine.js";
import { buildFamilyRolesFromFamilies } from "./familyAdapter.js";

export const DEFAULT_AUTHOR_WORKSPACE_ID = "bundled_author";

export const DEFAULT_AUTHOR_WORKSPACE = Object.freeze({
	id: DEFAULT_AUTHOR_WORKSPACE_ID,
	name: "Родовід Селіванових",
	type: "bundled",
	isOwner: false, // Встановлюється динамічно відповідно до прав користувача
	probandId: "1",
	probandName: "Іван Селіванов",
	description: "Основне родинне дерево проєкту Geneo",
	createdAt: 0,
});

const STORAGE_KEYS = {
	WORKSPACES_META: "geneo_workspaces_v1",
	ACTIVE_WS_ID: "geneo_active_ws_id",
	WS_DB_PREFIX: "geneo_ws_db_",
};

export class WorkspaceManager {
	constructor() {
		this.workspaces = [];
		this.activeWorkspaceId = DEFAULT_AUTHOR_WORKSPACE_ID;
		this.activeWorkspace = { ...DEFAULT_AUTHOR_WORKSPACE };
		this.isMainAdmin = false;
	}

	/**
	 * Ініціалізація реєстру просторів із збережених даних або дефолтних налаштувань
	 */
	async init(userConfig = {}) {
		this.isMainAdmin = !!userConfig.isMainAdmin;
		const userEmail = (userConfig.email || "").toLowerCase().trim();
		this.isAuthorOwner = userEmail === "ivanselivanov771994@gmail.com" || !!userConfig.isAuthorOwner;
		const hasAuthorTreeAccess = this.isAuthorOwner || userConfig.hasAuthorTreeAccess === true;

		// Якщо доступ до дерева автора відкликано, негайно очищуємо локально кешовані таблиці та kinship
		if (!hasAuthorTreeAccess && typeof localforage !== "undefined") {
			try {
				const keys = await localforage.keys();
				for (const k of keys) {
					if (k.includes("/data/db/") || k.startsWith("kinship_index_") || k === "store_version") {
						await localforage.removeItem(k);
					}
				}
			} catch (e) {
				console.warn("Помилка очищення кешу дерева автора:", e);
			}
		}

		let savedMeta = [];
		try {
			const raw = localStorage.getItem(STORAGE_KEYS.WORKSPACES_META);
			if (raw) savedMeta = JSON.parse(raw);
		} catch (e) {
			console.warn("Помилка читання geneo_workspaces_v1:", e);
		}

		const customList = Array.isArray(savedMeta)
			? savedMeta.filter((w) => w && w.id && w.id !== DEFAULT_AUTHOR_WORKSPACE_ID)
			: [];

		// Дерево автора додається ТІЛЬКИ якщо користувач має до нього доступ
		if (hasAuthorTreeAccess) {
			const authorWs = {
				...DEFAULT_AUTHOR_WORKSPACE,
				isOwner: this.isAuthorOwner, // Тільки первинний автор (ivanselivanov771994@gmail.com) є власником дерева автора
			};
			this.workspaces = [authorWs, ...customList];
		} else {
			this.workspaces = [...customList];
		}

		// Визначення активного простору
		const urlParams = new URLSearchParams(window.location.search);
		const requestedWsId = urlParams.get("ws");
		const storedWsId = localStorage.getItem(STORAGE_KEYS.ACTIVE_WS_ID);

		let targetId = requestedWsId || storedWsId;
		if (!hasAuthorTreeAccess && targetId === DEFAULT_AUTHOR_WORKSPACE_ID) {
			targetId = customList.length > 0 ? customList[0].id : null;
		} else if (!targetId) {
			targetId = hasAuthorTreeAccess ? DEFAULT_AUTHOR_WORKSPACE_ID : (customList[0]?.id || null);
		}

		const found = this.workspaces.find((w) => w.id === targetId);

		if (found) {
			this.activeWorkspaceId = found.id;
			this.activeWorkspace = found;
			localStorage.setItem(STORAGE_KEYS.ACTIVE_WS_ID, this.activeWorkspaceId);
		} else if (hasAuthorTreeAccess && this.workspaces.length > 0) {
			this.activeWorkspaceId = DEFAULT_AUTHOR_WORKSPACE_ID;
			this.activeWorkspace = this.workspaces[0];
			localStorage.setItem(STORAGE_KEYS.ACTIVE_WS_ID, this.activeWorkspaceId);
		} else if (customList.length > 0) {
			this.activeWorkspaceId = customList[0].id;
			this.activeWorkspace = customList[0];
			localStorage.setItem(STORAGE_KEYS.ACTIVE_WS_ID, this.activeWorkspaceId);
		} else {
			this.activeWorkspaceId = null;
			this.activeWorkspace = null;
			localStorage.removeItem(STORAGE_KEYS.ACTIVE_WS_ID);
		}

		this._persistMeta();

		return this.activeWorkspace;
	}

	getActiveWorkspace() {
		return this.activeWorkspace;
	}

	listWorkspaces() {
		return [...this.workspaces];
	}

	getWorkspaces() {
		return this.listWorkspaces();
	}

	/**
	 * Чи має поточний користувач право надавати доступ до активного дерева?
	 * Суворе правило: ділитися може ВИКЛЮЧНО власник цього дерева!
	 */
	canShareCurrentWorkspace() {
		if (!this.activeWorkspace) return false;
		if (this.activeWorkspace.id === DEFAULT_AUTHOR_WORKSPACE_ID) {
			return this.isAuthorOwner; // ТІЛЬКИ ivanselivanov771994@gmail.com
		}
		return !!this.activeWorkspace.isOwner;
	}

	/**
	 * Завантаження даних для активного простору:
	 * - для 'bundled': стандартний виклик fetchAllData(userConfig) з бекенду/кешу
	 * - для 'local': читання збереженої бази з localforage (IndexedDB) та ініціалізація FamilyEngine
	 */
	async loadActiveEngine(userConfig = {}) {
		const ws = this.getActiveWorkspace();

		if (!ws || (ws.id === DEFAULT_AUTHOR_WORKSPACE_ID && userConfig.hasAuthorTreeAccess === false)) {
			return null;
		}

		if (ws.type === "bundled") {
			const engine = await fetchAllData(userConfig);
			this.engine = engine;
			return engine;
		}

		// Локальний простір (імпортований GEDCOM) або Google Диск (BYOS)
		if (ws.type === "local" || ws.type === "gdrive") {
			try {
				let localDb = null;
				if (typeof localforage !== "undefined") {
					localDb = await localforage.getItem(`${STORAGE_KEYS.WS_DB_PREFIX}${ws.id}`);
				}

				if (!localDb || !localDb.basic || localDb.basic.length === 0) {
					console.warn(`Дані для дерева ${ws.id} не знайдено в localforage, повертаємося до основного.`);
					this.switchWorkspace(DEFAULT_AUTHOR_WORKSPACE_ID);
					return null;
				}

				// Якщо потрібно — синтезуємо ролі
				if (
					(!localDb.familyRoles || localDb.familyRoles.length === 0) &&
					Array.isArray(localDb.families) &&
					Array.isArray(localDb.familyChildren)
				) {
					localDb.familyRoles = buildFamilyRolesFromFamilies(localDb.families, localDb.familyChildren);
				}

				const engine = new FamilyEngine(
					localDb.basic || [],
					localDb.familyList || [],
					localDb.familyRoles || [],
					localDb,
					{}, // kinshipData
				);

				this.engine = engine;
				return engine;
			} catch (err) {
				console.error(`Помилка завантаження локального дерева ${ws.id}:`, err);
				this.switchWorkspace(DEFAULT_AUTHOR_WORKSPACE_ID);
				return null;
			}
		}

		const fallbackEngine = await fetchAllData(userConfig);
		this.engine = fallbackEngine;
		return fallbackEngine;
	}


	/**
	 * Створення / реєстрація простору, підключеного з Google Диску (Multi-Tree BYOS)
	 */
	async createGdriveWorkspace({ folderId, folderName, folderMap, dbData, probandId, probandName, personsCount, familiesCount }) {
		const newId = `gdrive_ws_${folderId}`;
		const cleanName = folderName || "Дерево на Google Диску";

		if (typeof localforage !== "undefined" && dbData) {
			await localforage.setItem(`${STORAGE_KEYS.WS_DB_PREFIX}${newId}`, dbData);
		}

		const pCount = personsCount || (dbData?.basic ? dbData.basic.length : 0);
		const fCount = familiesCount || (dbData?.families ? dbData.families.length : 0);

		const existingIdx = this.workspaces.findIndex((w) => w.id === newId || w.driveFolderId === folderId);
		const newWs = {
			id: newId,
			name: cleanName,
			type: "gdrive",
			isOwner: true,
			driveFolderId: folderId,
			driveFolderName: cleanName,
			folderMap: folderMap,
			probandId: String(probandId || "1"),
			probandName: probandName || "Пробанд",
			personsCount: pCount,
			familiesCount: fCount,
			stats: { persons: pCount, families: fCount },
			description: "Дерево, підключене з власного Google Диску (BYOS)",
			createdAt: Date.now(),
		};

		if (existingIdx >= 0) {
			this.workspaces[existingIdx] = newWs;
		} else {
			this.workspaces.push(newWs);
		}

		this._persistMeta();
		return newWs;
	}

	setEngine(engine) {
		this.engine = engine;
	}

	/**
	 * Створення нового локального простору з імпортованого GEDCOM
	 */
	async createLocalWorkspace({ name, probandId, probandName, personsCount, familiesCount, dbData }) {
		const newId = `local_ws_${Date.now()}`;
		const cleanName = (name || "").trim() || `Родовід: ${probandName || "Нове дерево"}`;

		// 1. Зберігаємо базу даних у localforage
		if (typeof localforage !== "undefined") {
			await localforage.setItem(`${STORAGE_KEYS.WS_DB_PREFIX}${newId}`, dbData);
		} else {
			throw new Error("LocalForage (IndexedDB) недоступний у цьому середовищі");
		}

		// 2. Створюємо метадані простору
		const pCount = personsCount || (dbData.basic ? dbData.basic.length : 0);
		const fCount = familiesCount || (dbData.families ? dbData.families.length : 0);
		const newWs = {
			id: newId,
			name: cleanName,
			type: "local",
			isOwner: true, // Той, хто імпортував файл, є власником цього дерева
			probandId: String(probandId || "1"),
			probandName: probandName || "Пробанд",
			personsCount: pCount,
			familiesCount: fCount,
			stats: {
				persons: pCount,
				families: fCount,
			},
			description: "Локальне дерево, завантажене з GEDCOM",
			createdAt: Date.now(),
		};

		this.workspaces.push(newWs);
		this._persistMeta();

		return { ...newWs, dbData };
	}

	/**
	 * Отримати повну базу даних (31 таблицю) для будь-якого дерева
	 */
	async getWorkspaceDbData(workspaceId) {
		const target = this.workspaces.find((w) => w.id === workspaceId);
		if (!target) return null;
		if (target.type === "bundled") {
			return this.engine?.db || null;
		}
		if (typeof localforage !== "undefined") {
			return await localforage.getItem(`${STORAGE_KEYS.WS_DB_PREFIX}${workspaceId}`);
		}
		return null;
	}

	/**
	 * Перемикання на інше дерево
	 */
	switchWorkspace(workspaceId) {
		const target = this.workspaces.find((w) => w.id === workspaceId);
		if (!target) {
			console.error(`Дерево з ID ${workspaceId} не знайдено`);
			return false;
		}

		localStorage.setItem(STORAGE_KEYS.ACTIVE_WS_ID, target.id);

		// Перезавантажуємо сторінку з новим параметром для 100% чистого стану пам'яті
		const url = new URL(window.location.href);
		if (target.id === DEFAULT_AUTHOR_WORKSPACE_ID) {
			url.searchParams.delete("ws");
			url.searchParams.delete("id");
			url.searchParams.delete("view");
		} else {
			url.searchParams.set("ws", target.id);
			url.searchParams.delete("id");
			url.searchParams.delete("view");
		}
		window.location.href = url.toString();
		return true;
	}

	/**
	 * Видалення локального простору
	 */
	async deleteWorkspace(workspaceId) {
		if (workspaceId === DEFAULT_AUTHOR_WORKSPACE_ID) {
			alert("Основне дерево автора не можна видалити.");
			return false;
		}

		if (typeof localforage !== "undefined") {
			try {
				await localforage.removeItem(`${STORAGE_KEYS.WS_DB_PREFIX}${workspaceId}`);
			} catch (e) {
				console.warn("Помилка видалення бази з localforage:", e);
			}
		}

		this.workspaces = this.workspaces.filter((w) => w.id !== workspaceId);
		this._persistMeta();

		// Якщо видалили активний простір, повертаємося на основне дерево
		if (this.activeWorkspaceId === workspaceId) {
			this.switchWorkspace(DEFAULT_AUTHOR_WORKSPACE_ID);
		}

		return true;
	}

	_persistMeta() {
		try {
			const toSave = this.workspaces.filter((w) => w.id !== DEFAULT_AUTHOR_WORKSPACE_ID);
			localStorage.setItem(STORAGE_KEYS.WORKSPACES_META, JSON.stringify(toSave));
		} catch (e) {
			console.error("Не вдалося зберегти geneo_workspaces_v1:", e);
		}
	}
}
