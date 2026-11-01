// ./scripts/components/interaction/archiveImportManager.js

import JSZip from "jszip";
import Papa from "papaparse";
import { buildFamilyRolesFromFamilies } from "../../services/familyAdapter.js";

/**
 * Менеджер імпорту архівованої папки Geneo (.zip)
 * Дозволяє завантажити архів з іншого Google Диску чи резервну копію
 * та автоматично розгорнути дерево у робочому просторі і на Google Диску.
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

			this._showProgress("Перевірка цілісності структури родоводу...", 60);

			// Перевірка обов'язкових таблиць
			const hasBasic = Array.isArray(dbData.basic) && dbData.basic.length > 0;
			const hasFamilies = Array.isArray(dbData.families) && dbData.families.length > 0;

			if (!hasBasic || !hasFamilies) {
				this._hideProgress();
				this._showInvalidStructureModal(file.name, Object.keys(dbData), {
					hasBasic,
					hasFamilies,
				});
				return;
			}

			// Автоматичний синтез familyRoles якщо є families та familyChildren
			if (
				(!dbData.familyRoles || dbData.familyRoles.length === 0) &&
				Array.isArray(dbData.families) &&
				Array.isArray(dbData.familyChildren)
			) {
				dbData.familyRoles = buildFamilyRolesFromFamilies(dbData.families, dbData.familyChildren);
			}

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

			let targetWsId = "";

			// Якщо Google Диск підключено — автоматично створюємо папку проєкту на Диску та вивантажуємо дані
			if (this.driveService && this.driveService.isConnected()) {
				this._showProgress("Створення папки проєкту на Google Диску...", 75);
				const deployed = await this.driveService.createTreeFolderAndDeploy(treeName, dbData, (msg, pct) => {
					this._showProgress(`Google Диск: ${msg}`, 75 + Math.round(pct * 0.22));
				});

				const newWs = await this.workspaceManager.createGdriveWorkspace({
					folderId: deployed.folderId,
					folderName: deployed.folderName,
					folderMap: deployed.folderMap,
					dbData,
					probandId,
					probandName,
					personsCount,
					familiesCount,
				});
				targetWsId = newWs.id;
			} else {
				this._showProgress("Збереження бази у робочий простір...", 85);
				const newWs = await this.workspaceManager.createLocalWorkspace({
					name: treeName,
					probandId,
					probandName,
					personsCount,
					familiesCount,
					dbData,
				});
				targetWsId = newWs.id;
			}

			this._showProgress("Запуск родинного дерева...", 100);

			setTimeout(() => {
				this._hideProgress();
				this.workspaceManager.switchWorkspace(targetWsId);
			}, 350);

		} catch (err) {
			console.error("Помилка імпорту архіву Geneo:", err);
			this._hideProgress();
			alert("Не вдалося завантажити архів Geneo: " + err.message);
		}
	}

	_showInvalidStructureModal(fileName, presentTables, { hasBasic, hasFamilies }) {
		let overlay = document.getElementById("archive-error-modal");
		if (!overlay) {
			overlay = document.createElement("div");
			overlay.id = "archive-error-modal";
			overlay.className = "popup-overlay show";
			overlay.style.zIndex = "99999";
			document.body.appendChild(overlay);
		} else {
			overlay.classList.remove("hidden");
			overlay.classList.add("show");
		}

		const missing = [];
		if (!hasBasic) missing.push("basic.csv (Таблиця персон)");
		if (!hasFamilies) missing.push("families.csv (Таблиця сімей)");

		const present = presentTables.length > 0
			? presentTables.map(t => `${t}.csv`)
			: ["Жодної таблиці CSV не знайдено"];

		overlay.innerHTML = `
			<div class="popup-container" style="max-width: 520px; width: 92%; padding: 24px; border-radius: 16px; background: var(--color-bg-card); border: 1px solid var(--color-border); box-shadow: 0 20px 40px rgba(0,0,0,0.25);">
				<div style="font-size: 38px; color: #dc2626; margin-bottom: 8px;">
					<i class="ri-error-warning-line"></i>
				</div>
				<h3 style="margin: 0 0 8px; font-size: 18px; color: var(--color-text-main);">
					Невідповідна структура архіву «${escapeHtml(fileName)}»
				</h3>
				<p style="margin: 0 0 14px; font-size: 13px; color: var(--color-text-muted); line-height: 1.5;">
					В архіві відсутні обов'язкові компоненти бази даних Geneo. Додаток не може бути запущений без обов'язкових таблиць.
				</p>

				<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; font-size: 12px; text-align: left;">
					<div style="background: var(--color-bg-body); padding: 10px; border-radius: 8px; border: 1px solid var(--color-border);">
						<div style="font-weight: 600; color: #16a34a; margin-bottom: 4px;">✅ Знайдено в архіві:</div>
						${present.slice(0, 5).map(p => `<div>• ${escapeHtml(p)}</div>`).join("")}
						${present.length > 5 ? `<div style="color:var(--color-text-muted);">...та ще ${present.length - 5} файлів</div>` : ""}
					</div>
					<div style="background: var(--color-bg-body); padding: 10px; border-radius: 8px; border: 1px solid var(--color-border);">
						<div style="font-weight: 600; color: #dc2626; margin-bottom: 4px;">❌ Обов'язково відсутні:</div>
						${missing.map(m => `<div>• ${escapeHtml(m)}</div>`).join("")}
					</div>
				</div>

				<div style="background: var(--color-bg-body); padding: 12px; border-radius: 8px; border: 1px solid var(--color-border); margin-bottom: 16px; font-size: 12px; text-align: left; line-height: 1.5;">
					<div style="font-weight: 600; margin-bottom: 6px; color: var(--color-text-main);">
						📋 Еталонна структура папки Geneo (обов'язкова умова для запуску):
					</div>
					<div style="font-family: monospace; background: var(--color-bg-card); padding: 8px 10px; border-radius: 6px; border: 1px solid var(--color-border); margin-bottom: 6px; color: var(--color-text-main); font-size: 11px;">
						Geneo - [Назва родоводу]/<br>
						├── db/ (basic.csv, families.csv, familyChildren.csv)<br>
						└── records/ (підпапки portraits/, family_photos/, scans/)
					</div>
					<div style="color: var(--color-text-muted);">
						Будь ласка, перевірте архів або підготуйте файли згідно з еталонною структурою.
					</div>
				</div>

				<div style="display: flex; gap: 10px; justify-content: flex-end;">
					<button id="btn-close-archive-error" type="button" class="btn btn-primary btn-sm" style="padding: 8px 18px; font-weight: 600;">
						Зрозуміло, обрати інший файл
					</button>
				</div>
			</div>
		`;

		const btnClose = overlay.querySelector("#btn-close-archive-error");
		if (btnClose) {
			btnClose.onclick = () => {
				overlay.classList.remove("show");
				overlay.classList.add("hidden");
			};
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

function escapeHtml(str) {
	if (!str) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}
