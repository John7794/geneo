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
		this.isMainAdmin = !!(userConfig.isMainAdmin || userConfig.canShare);

		let savedMeta = [];
		try {
			const raw = localStorage.getItem(STORAGE_KEYS.WORKSPACES_META);
			if (raw) savedMeta = JSON.parse(raw);
		} catch (e) {
			console.warn("Помилка читання geneo_workspaces_v1:", e);
		}

		// Завжди гарантуємо наявність основного дерева автора
		const authorWs = {
			...DEFAULT_AUTHOR_WORKSPACE,
			isOwner: this.isMainAdmin, // Тільки автор є власником свого дерева
		};

		const customList = Array.isArray(savedMeta)
			? savedMeta.filter((w) => w && w.id && w.id !== DEFAULT_AUTHOR_WORKSPACE_ID)
			: [];

		this.workspaces = [authorWs, ...customList];

		// Визначення активного простору: URL param ?ws=... -> localStorage -> fallback
		const urlParams = new URLSearchParams(window.location.search);
		const requestedWsId = urlParams.get("ws");
		const storedWsId = localStorage.getItem(STORAGE_KEYS.ACTIVE_WS_ID);

		const targetId = requestedWsId || storedWsId || DEFAULT_AUTHOR_WORKSPACE_ID;
		const found = this.workspaces.find((w) => w.id === targetId);

		if (found) {
			this.activeWorkspaceId = found.id;
			this.activeWorkspace = found;
		} else {
			this.activeWorkspaceId = DEFAULT_AUTHOR_WORKSPACE_ID;
			this.activeWorkspace = authorWs;
		}

		localStorage.setItem(STORAGE_KEYS.ACTIVE_WS_ID, this.activeWorkspaceId);
		this._persistMeta();

		return this.activeWorkspace;
	}

	getActiveWorkspace() {
		return this.activeWorkspace || { ...DEFAULT_AUTHOR_WORKSPACE };
	}

	listWorkspaces() {
		return [...this.workspaces];
	}

	/**
	 * Чи має поточний користувач право надавати доступ до активного дерева?
	 * Суворе правило: ділитися може ВИКЛЮЧНО власник цього дерева!
	 */
	canShareCurrentWorkspace() {
		if (!this.activeWorkspace) return false;
		if (this.activeWorkspace.id === DEFAULT_AUTHOR_WORKSPACE_ID) {
			return this.isMainAdmin;
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

		if (ws.type === "bundled") {
			return await fetchAllData(userConfig);
		}

		// Локальний простір (імпортований GEDCOM)
		if (ws.type === "local") {
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

				return engine;
			} catch (err) {
				console.error(`Помилка завантаження локального дерева ${ws.id}:`, err);
				this.switchWorkspace(DEFAULT_AUTHOR_WORKSPACE_ID);
				return null;
			}
		}

		return await fetchAllData(userConfig);
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
		const newWs = {
			id: newId,
			name: cleanName,
			type: "local",
			isOwner: true, // Той, хто імпортував файл, є власником цього дерева
			probandId: String(probandId || "1"),
			probandName: probandName || "Пробанд",
			personsCount: personsCount || (dbData.basic ? dbData.basic.length : 0),
			familiesCount: familiesCount || (dbData.families ? dbData.families.length : 0),
			description: "Локальне дерево, завантажене з GEDCOM",
			createdAt: Date.now(),
		};

		this.workspaces.push(newWs);
		this._persistMeta();

		return newWs;
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
