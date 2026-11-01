// ./scripts/components/interaction/archiveImportManager.js

import JSZip from "jszip";
import Papa from "papaparse";
import { buildFamilyRolesFromFamilies } from "../../services/familyAdapter.js";

/**
 * Менеджер імпорту архівованої папки Geneo (.zip)
 * Дозволяє завантажити архів з іншого Google Диску чи резервну копію
 * та автоматично розгорнути дерево у робочому просторі.
 */
export class ArchiveImportManager {
	constructor(workspaceManager, driveService = null) {
		this.workspaceManager = workspaceManager;
		this.driveService = driveService;
		this.isProcessing = false;
	}

	/**
	 * Обробити завантажений .zip файл Geneo
	 * @param {File} file
	 */
	async handleZipFile(file) {
		if (!file) return;
		if (!file.name.toLowerCase().endsWith(".zip")) {
			alert("Будь ласка, оберіть файл архіву формату .zip");
			return;
		}

		this._showProgress("Відкриття архіву Geneo (.zip)...", 15);

		try {
			const zip = await JSZip.loadAsync(file);
			this._showProgress("Аналіз вмісту архіву та пошук таблиць баз даних...", 35);

			const dbData = {};
			let metadata = null;

			const entries = Object.keys(zip.files);
			for (const path of entries) {
				const entry = zip.files[path];
				if (entry.dir) continue;

				const lowerPath = path.toLowerCase();
				const fileName = lowerPath.split("/").pop();

				if (fileName === "metadata.json") {
					try {
						const metaStr = await entry.async("string");
						metadata = JSON.parse(metaStr);
					} catch (e) {}
					continue;
				}

				if (fileName.endsWith(".csv")) {
					const tableName = fileName.replace(/\.csv$/, "");
					const csvText = await entry.async("string");
					const parsed = Papa.parse(csvText, {
						header: true,
						skipEmptyLines: true,
					});

					let key = tableName;
					if (key === "familychildren") key = "familyChildren";
					if (key === "familyroles") key = "familyRoles";
					if (key === "familylist") key = "familyList";

					dbData[key] = parsed.data || [];
				}
			}

			this._showProgress("Перевірка цілісності даних родоводу...", 65);

			if (!dbData.basic || !Array.isArray(dbData.basic) || dbData.basic.length === 0) {
				throw new Error("В архіві не знайдено обов'язкової таблиці basic.csv (Персони). Переконайтеся, що архів містить кореневу папку родоводу Geneo.");
			}

			// Автоматичний синтез familyRoles якщо є families та familyChildren
			if (
				(!dbData.familyRoles || dbData.familyRoles.length === 0) &&
				Array.isArray(dbData.families) &&
				Array.isArray(dbData.familyChildren)
			) {
				dbData.familyRoles = buildFamilyRolesFromFamilies(dbData.families, dbData.familyChildren);
			}

			this._showProgress("Створення робочого простору та збереження бази...", 85);

			// Визначення назви родоводу
			let treeName = metadata?.workspaceName || metadata?.name || "";
			if (!treeName) {
				treeName = file.name
					.replace(/\.zip$/i, "")
					.replace(/^Geneo\s*-\s*/i, "")
					.replace(/^Geneo_/i, "");
				if (!treeName.toLowerCase().startsWith("родовід")) {
					treeName = `Родовід: ${treeName}`;
				}
			}

			// Визначення Пробанда
			const firstPerson = dbData.basic[0];
			const probandId = String(metadata?.probandId || firstPerson?.person_id || firstPerson?.id || "1");
			const probandName = firstPerson
				? `${firstPerson.first_name || ""} ${firstPerson.last_name || ""}`.trim() || "Пробанд"
				: "Пробанд";

			const personsCount = dbData.basic.length;
			const familiesCount = (dbData.families || []).length;

			// Створення локального простору
			const newWs = await this.workspaceManager.createLocalWorkspace({
				name: treeName,
				probandId,
				probandName,
				personsCount,
				familiesCount,
				dbData,
			});

			this._showProgress("Запуск родинного дерева...", 100);

			setTimeout(() => {
				this._hideProgress();
				this.workspaceManager.switchWorkspace(newWs.id);
			}, 350);

		} catch (err) {
			console.error("Помилка імпорту архіву Geneo:", err);
			this._hideProgress();
			alert("Не вдалося завантажити архів Geneo: " + err.message);
		}
	}

	_showProgress(msg, percent) {
		let overlay = document.getElementById("archive-import-overlay");
		if (!overlay) {
			overlay = document.createElement("div");
			overlay.id = "archive-import-overlay";
			overlay.className = "popup-overlay show";
			overlay.style.zIndex = "99999";
			overlay.innerHTML = `
				<div class="popup-container" style="max-width: 440px; padding: 24px; text-align: center; border-radius: 16px; background: var(--color-bg-card); border: 1px solid var(--color-border); box-shadow: 0 20px 40px rgba(0,0,0,0.25);">
					<div style="font-size: 42px; color: #f59e0b; margin-bottom: 12px;">
						<i class="ri-folder-zip-line"></i>
					</div>
					<h3 id="archive-import-title" style="margin: 0 0 8px; font-size: 18px; color: var(--color-text-main);">
						Імпорт архіву Geneo (.zip)
					</h3>
					<p id="archive-import-msg" style="margin: 0 0 16px; font-size: 13px; color: var(--color-text-muted);">
						${msg}
					</p>
					<div class="progress-bar" style="height: 8px; background: var(--color-bg-body); border-radius: 4px; overflow: hidden; border: 1px solid var(--color-border);">
						<div id="archive-import-fill" class="progress-fill" style="width: ${percent}%; height: 100%; background: var(--color-primary); transition: width 0.3s ease;"></div>
					</div>
				</div>
			`;
			document.body.appendChild(overlay);
		} else {
			overlay.classList.remove("hidden");
			overlay.classList.add("show");
			const msgEl = overlay.querySelector("#archive-import-msg");
			const fillEl = overlay.querySelector("#archive-import-fill");
			if (msgEl) msgEl.textContent = msg;
			if (fillEl) fillEl.style.width = `${percent}%`;
		}
	}

	_hideProgress() {
		const overlay = document.getElementById("archive-import-overlay");
		if (overlay) {
			overlay.classList.remove("show");
			overlay.classList.add("hidden");
		}
	}
}
