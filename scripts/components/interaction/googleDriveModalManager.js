// ./scripts/components/interaction/googleDriveModalManager.js

/**
 * Керування інтерфейсом Google Drive (BYOS)
 */
export class GoogleDriveModalManager {
	constructor(driveService, workspaceManager) {
		this.drive = driveService;
		this.workspaceManager = workspaceManager;
		this.modal = document.getElementById("google-drive-modal");
		this.openButtons = document.querySelectorAll(".js-open-gdrive");
		this.closeButton = document.getElementById("btn-close-gdrive");

		this._initDomEvents();

		this.drive.onStateChange(() => {
			if (this.isOpen()) this.render();
		});
	}

	_initDomEvents() {
		this.openButtons.forEach((btn) => {
			btn.addEventListener("click", (e) => {
				e.preventDefault();
				this.open();
			});
		});

		document.addEventListener("click", (e) => {
			if (e.target.closest("#btn-gdrive, .js-open-gdrive")) {
				e.preventDefault();
				this.open();
			}
		});

		if (this.closeButton) {
			this.closeButton.addEventListener("click", () => this.close());
		}

		if (this.modal) {
			this.modal.addEventListener("click", (e) => {
				if (e.target === this.modal) this.close();
			});
		}

		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && this.isOpen()) {
				this.close();
			}
		});
	}

	isOpen() {
		return this.modal && this.modal.classList.contains("show") && !this.modal.classList.contains("hidden");
	}

	async open() {
		if (!this.modal) return;
		this.modal.classList.remove("hidden");
		this.modal.classList.add("show");
		await this.render();
	}

	close() {
		if (!this.modal) return;
		this.modal.classList.remove("show");
		this.modal.classList.add("hidden");
	}

	async render() {
		if (!this.modal) return;
		const isConnected = this.drive.isConnected();
		const userInfo = this.drive.userInfo;
		const folderMap = this.drive.folderMap;
		const activeWs = this.workspaceManager?.getActiveWorkspace();

		let quota = null;
		if (isConnected) {
			quota = await this.drive.getQuota();
		}

		const body = this.modal.querySelector("#gdrive-modal-content");
		if (!body) return;

		body.innerHTML = `
			<div class="gdrive-container">
				<!-- СТАТУС ПІДКЛЮЧЕННЯ -->
				<div class="gdrive-status-card ${isConnected ? "connected" : "disconnected"}">
					<div class="status-card-header">
						<div class="gdrive-logo-badge">
							<i class="ri-google-fill"></i>
						</div>
						<div class="status-card-info">
							<h3>${isConnected ? "Google Диск підключено" : "Google Диск не підключено"}</h3>
							<p>${isConnected ? (userInfo?.email || "Особистий обліковий запис Google") : "Зберігайте базу даних та фотографії на власному Диску (BYOS)"}</p>
						</div>
						<div class="status-card-action">
							${
								isConnected
									? `<button id="btn-gdrive-disconnect" class="btn btn-outline btn-sm">Відключити</button>`
									: `<button id="btn-gdrive-connect" class="btn btn-primary">
										<i class="ri-google-fill"></i> Підключити мій Google Диск
									</button>`
							}
						</div>
					</div>

					${
						isConnected && quota
							? `
						<div class="gdrive-quota-box">
							<div class="quota-meta-row">
								<span>Використано пам'яті: <strong>${(quota.usageBytes / (1024 * 1024 * 1024)).toFixed(2)} GB</strong> з ${(quota.limitBytes / (1024 * 1024 * 1024)).toFixed(1)} GB</span>
								<span class="quota-pct">${quota.percentUsed}%</span>
							</div>
							<div class="quota-bar-wrapper">
								<div class="quota-bar-fill ${quota.isLowSpace ? "warning" : ""}" style="width: ${Math.min(100, quota.percentUsed)}%;"></div>
							</div>
							${
								quota.isLowSpace
									? `<div class="quota-warning-badge"><i class="ri-alert-line"></i> Залишилося менше 500 MB вільного місця!</div>`
									: ""
							}
						</div>
					`
							: ""
					}

					${
						!isConnected
							? `
						<div class="gdrive-setup-hint">
							<details class="advanced-settings-toggle">
								<summary>⚙️ Налаштування Google Client ID (Необов'язково)</summary>
								<div class="custom-client-box">
									<p class="text-sm text-muted">Ви можете використовувати персональний OAuth Client ID з вашої Google Cloud Console:</p>
									<div class="flex-row gap-2">
										<input type="text" id="gdrive-custom-client-id" class="form-input" value="${this.drive.getClientId()}" placeholder="Ваш Google Client ID..." />
										<button id="btn-save-client-id" class="btn btn-secondary btn-sm">Зберегти</button>
									</div>
								</div>
							</details>
							<div class="test-mode-note">
								<button id="btn-gdrive-demo-mode" class="btn btn-secondary btn-sm w-full" style="margin-top: 10px;">
									<i class="ri-flask-line"></i> Увімкнути тестовий режим без Google OAuth (Simulation)
								</button>
							</div>
						</div>
					`
							: ""
					}
				</div>

				<!-- СТРУКТУРА ПАПОК -->
				<div class="gdrive-section-card">
					<div class="section-card-header">
						<h4><i class="ri-folder-shared-line"></i> Ієрархія папок Geneo на вашому Google Диску:</h4>
						<button id="btn-gdrive-deploy-structure" class="btn btn-primary btn-sm" ${!isConnected ? "disabled" : ""}>
							<i class="ri-folder-add-line"></i> ${folderMap ? "Перевірити / Оновити структуру" : "Розгорнути структуру"}
						</button>
					</div>

					<div class="gdrive-tree-preview">
						<div class="folder-row root"><i class="ri-folder-fill"></i> <strong>Geneo/</strong> ${folderMap ? "✅" : "⚪"}</div>
						<div class="folder-row indent-1"><i class="ri-folder-fill"></i> <strong>db/</strong> (Таблиці)</div>
						<div class="folder-row indent-2"><i class="ri-folder-line"></i> uk/ (31 таблиця CSV) ${folderMap?.dbUk ? "✅" : "⚪"}</div>
						<div class="folder-row indent-1"><i class="ri-folder-fill"></i> <strong>records/</strong> (Архівні матеріали)</div>
						<div class="folder-row indent-2"><i class="ri-folder-line"></i> portraits/ (Портрети осіб) ${folderMap?.portraits ? "✅" : "⚪"}</div>
						<div class="folder-row indent-2"><i class="ri-folder-line"></i> family_photos/ (Сімейні фото по ID) ${folderMap?.familyPhotos ? "✅" : "⚪"}</div>
						<div class="folder-row indent-2"><i class="ri-folder-line"></i> scans/ (Скани документів)</div>
						<div class="folder-row indent-3"><i class="ri-folder-line"></i> awards/medals/ (Фото медалей) ${folderMap?.awardsMedals ? "✅" : "⚪"}</div>
						<div class="folder-row indent-3"><i class="ri-folder-line"></i> awards/records/ (Нагородні грамоти) ${folderMap?.awardsRecords ? "✅" : "⚪"}</div>
						<div class="folder-row indent-3"><i class="ri-folder-line"></i> confessions/ (Сповідні відомості) ${folderMap?.confessions ? "✅" : "⚪"}</div>
						<div class="folder-row indent-3"><i class="ri-folder-line"></i> metrics/{birth, marriage, death}/ ${folderMap?.metricsBirth ? "✅" : "⚪"}</div>
						<div class="folder-row indent-3"><i class="ri-folder-line"></i> military/ (Військові документи) ${folderMap?.military ? "✅" : "⚪"}</div>
					</div>
					<div id="deploy-progress-container" class="progress-box hidden">
						<p id="deploy-progress-text" class="text-sm"></p>
						<div class="progress-bar"><div id="deploy-progress-fill" class="progress-fill"></div></div>
					</div>
				</div>

				<!-- СИНХРОНІЗАЦІЯ ДЕРЕВА -->
				<div class="gdrive-section-card">
					<div class="section-card-header">
						<h4><i class="ri-refresh-line"></i> Синхронізація активного дерева:</h4>
						<button id="btn-gdrive-sync-db" class="btn btn-primary btn-sm" ${!isConnected ? "disabled" : ""}>
							<i class="ri-upload-cloud-line"></i> Синхронізувати зараз
						</button>
					</div>
					<p class="text-sm text-muted">
						Дерево: <strong>«${activeWs?.name || "Поточне дерево"}»</strong>. Всі 31 таблиця будуть перетворені на CSV і записані в папку <code>Geneo/db/uk/</code> на вашому Диску.
					</p>
					<div id="sync-progress-container" class="progress-box hidden">
						<p id="sync-progress-text" class="text-sm"></p>
						<div class="progress-bar"><div id="sync-progress-fill" class="progress-fill"></div></div>
					</div>
				</div>

				<!-- ШВИДКЕ ЗАВАНТАЖЕННЯ АРХІВНИХ ДОКУМЕНТІВ -->
				<div class="gdrive-section-card">
					<h4><i class="ri-image-add-line"></i> Завантаження архівного фото чи скану:</h4>
					<p class="text-sm text-muted">Оберіть категорію та файл — система автоматично направить його у відповідну підпапку на вашому Google Диску.</p>

					<form id="gdrive-upload-form" class="gdrive-upload-form">
						<div class="form-grid-row">
							<div class="form-group flex-1">
								<label for="media-category-select">Категорія документа:</label>
								<select id="media-category-select" class="form-input" required>
									<option value="portrait">Портрет персони (records/portraits/{id}.jpg)</option>
									<option value="family_photo">Сімейне фото (records/family_photos/{id}/)</option>
									<option value="medal">Медаль / Орден (records/scans/awards/medals/{id}/)</option>
									<option value="award_record">Нагородний документ (records/scans/awards/records/{id}/)</option>
									<option value="confession">Сповідальний розпис (records/scans/confessions/)</option>
									<option value="metric_birth">Метрична книга: Народження (records/scans/metrics/birth/)</option>
									<option value="metric_marriage">Метрична книга: Шлюб (records/scans/metrics/marriage/)</option>
									<option value="metric_death">Метрична книга: Смерть (records/scans/metrics/death/)</option>
									<option value="military">Військовий документ (records/scans/military/)</option>
								</select>
							</div>
							<div class="form-group" style="max-width: 130px;">
								<label for="media-entity-id">ID персони / сім'ї:</label>
								<input type="text" id="media-entity-id" class="form-input" placeholder="Напр. 1" required />
							</div>
						</div>

						<div class="drop-zone-wrapper">
							<input type="file" id="media-file-input" class="hidden-file-input" accept="image/*,application/pdf" required />
							<div id="drop-zone" class="drop-zone">
								<i class="ri-upload-2-line drop-icon"></i>
								<p>Перетягніть файл сюди або <span>оберіть на комп'ютері</span></p>
								<span id="selected-file-name" class="selected-name text-sm text-muted"></span>
							</div>
						</div>

						<button type="submit" id="btn-do-upload-media" class="btn btn-primary w-full" ${!isConnected ? "disabled" : ""}>
							<i class="ri-cloud-upload-line"></i> Завантажити на Google Диск
						</button>
					</form>

					<div id="upload-result-box" class="upload-result-box hidden"></div>
				</div>
			</div>
		`;

		this._bindEvents();
	}

	_bindEvents() {
		// Кнопка Підключити
		const btnConnect = this.modal.querySelector("#btn-gdrive-connect");
		if (btnConnect) {
			btnConnect.onclick = async () => {
				try {
					btnConnect.disabled = true;
					btnConnect.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Запит доступу...`;
					await this.drive.requestAccess();
				} catch (e) {
					alert(e.message || "Помилка авторизації Google");
					btnConnect.disabled = false;
					btnConnect.innerHTML = `<i class="ri-google-fill"></i> Підключити мій Google Диск`;
				}
			};
		}

		// Кнопка Відключити
		const btnDisconnect = this.modal.querySelector("#btn-gdrive-disconnect");
		if (btnDisconnect) {
			btnDisconnect.onclick = () => {
				if (confirm("Відключити зв'язок з вашим Google Диском?")) {
					this.drive.disconnect();
					this.render();
				}
			};
		}

		// Збереження власного Client ID
		const btnSaveClientId = this.modal.querySelector("#btn-save-client-id");
		if (btnSaveClientId) {
			btnSaveClientId.onclick = () => {
				const val = this.modal.querySelector("#gdrive-custom-client-id")?.value;
				if (val) {
					this.drive.setClientId(val);
					alert("Google Client ID збережено.");
				}
			};
		}

		// Тестовий режим (Simulation Mode)
		const btnDemo = this.modal.querySelector("#btn-gdrive-demo-mode");
		if (btnDemo) {
			btnDemo.onclick = () => {
				this.drive.setAccessToken("demo_simulation_token_2026", 86400);
				this.drive._saveUserInfo({
					name: "Дослідник (Тестовий режим)",
					email: "my-drive@gmail.com",
				});
				alert("Тестовий режим увімкнено! Тепер ви можете протестувати розгортання структури та роботу інтерфейсу.");
				this.render();
			};
		}

		// Розгортання структури папок
		const btnDeploy = this.modal.querySelector("#btn-gdrive-deploy-structure");
		if (btnDeploy) {
			btnDeploy.onclick = async () => {
				const progressBox = this.modal.querySelector("#deploy-progress-container");
				const progressText = this.modal.querySelector("#deploy-progress-text");
				const progressFill = this.modal.querySelector("#deploy-progress-fill");

				try {
					btnDeploy.disabled = true;
					if (progressBox) progressBox.classList.remove("hidden");

					await this.drive.ensureFolderHierarchy((msg, pct) => {
						if (progressText) progressText.innerText = msg;
						if (progressFill) progressFill.style.width = `${pct}%`;
					});

					alert("Всі 12 папок Geneo успішно створено та перевірено на вашому Google Диску!");
					this.render();
				} catch (e) {
					alert("Помилка розгортання папок: " + e.message);
				} finally {
					btnDeploy.disabled = false;
				}
			};
		}

		// Синхронізація бази даних активного простору
		const btnSyncDb = this.modal.querySelector("#btn-gdrive-sync-db");
		if (btnSyncDb) {
			btnSyncDb.onclick = async () => {
				const progressBox = this.modal.querySelector("#sync-progress-container");
				const progressText = this.modal.querySelector("#sync-progress-text");
				const progressFill = this.modal.querySelector("#sync-progress-fill");

				try {
					btnSyncDb.disabled = true;
					if (progressBox) progressBox.classList.remove("hidden");

					const activeWs = this.workspaceManager.getActiveWorkspace();
					// Отримуємо повну базу даних
					let dbData = await this.workspaceManager.getWorkspaceDbData(activeWs.id);
					if (!dbData && activeWs.dbData) dbData = activeWs.dbData;
					if (!dbData && this.workspaceManager.engine) {
						dbData = this.workspaceManager.engine.db;
					}

					await this.drive.syncWorkspaceDatabaseToDrive(
						{ ...activeWs, dbData },
						(tableName, pct) => {
							if (progressText) progressText.innerText = `Завантаження ${tableName}... (${pct}%)`;
							if (progressFill) progressFill.style.width = `${pct}%`;
						},
					);

					alert("Базу даних (31 таблицю та metadata.json) успішно синхронізовано з Google Диском!");
					if (progressBox) progressBox.classList.add("hidden");
				} catch (e) {
					alert("Помилка синхронізації: " + e.message);
				} finally {
					btnSyncDb.disabled = false;
				}
			};
		}

		// Завантаження медіа
		const dropZone = this.modal.querySelector("#drop-zone");
		const fileInput = this.modal.querySelector("#media-file-input");
		const fileNameEl = this.modal.querySelector("#selected-file-name");

		if (dropZone && fileInput) {
			dropZone.onclick = () => fileInput.click();
			fileInput.onchange = () => {
				if (fileInput.files?.[0]) {
					fileNameEl.innerText = `Обрано: ${fileInput.files[0].name} (${(fileInput.files[0].size / 1024).toFixed(1)} KB)`;
				}
			};

			dropZone.ondragover = (e) => {
				e.preventDefault();
				dropZone.classList.add("drag-hover");
			};
			dropZone.ondragleave = () => dropZone.classList.remove("drag-hover");
			dropZone.ondrop = (e) => {
				e.preventDefault();
				dropZone.classList.remove("drag-hover");
				if (e.dataTransfer.files?.[0]) {
					fileInput.files = e.dataTransfer.files;
					fileNameEl.innerText = `Обрано: ${fileInput.files[0].name} (${(fileInput.files[0].size / 1024).toFixed(1)} KB)`;
				}
			};
		}

		const uploadForm = this.modal.querySelector("#gdrive-upload-form");
		if (uploadForm) {
			uploadForm.onsubmit = async (e) => {
				e.preventDefault();
				const file = fileInput?.files?.[0];
				if (!file) {
					alert("Будь ласка, оберіть файл для завантаження.");
					return;
				}

				const category = this.modal.querySelector("#media-category-select").value;
				const entityId = this.modal.querySelector("#media-entity-id").value.trim();
				const btnSubmit = this.modal.querySelector("#btn-do-upload-media");
				const resultBox = this.modal.querySelector("#upload-result-box");

				try {
					btnSubmit.disabled = true;
					btnSubmit.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Завантаження на Google Диск...`;

					const res = await this.drive.uploadMedia({
						file,
						category,
						entityId,
					});

					if (resultBox) {
						resultBox.classList.remove("hidden");
						resultBox.innerHTML = `
							<div class="upload-success-alert">
								<i class="ri-checkbox-circle-line"></i>
								<div>
									<strong>Файл успішно завантажено!</strong>
									<p>Назва: <code>${res.name}</code></p>
									${res.webViewLink ? `<a href="${res.webViewLink}" target="_blank" class="drive-link">Відкрити файл на Google Диску ↗</a>` : ""}
								</div>
							</div>
						`;
					}

					uploadForm.reset();
					fileNameEl.innerText = "";
				} catch (err) {
					alert("Помилка завантаження файлу: " + err.message);
				} finally {
					btnSubmit.disabled = false;
					btnSubmit.innerHTML = `<i class="ri-cloud-upload-line"></i> Завантажити на Google Диск`;
				}
			};
		}
	}
}
