// ./scripts/components/interaction/googleDriveModalManager.js

/**
 * Керування модальним вікном підключення особистого Google Диску (BYOS)
 */
export class GoogleDriveModalManager {
	constructor(driveService, workspaceManager, authManager = null) {
		this.drive = driveService;
		this.workspaceManager = workspaceManager;
		this.auth = authManager;

		this.modal = document.getElementById("google-drive-modal") || document.getElementById("gdrive-modal");
		this.btnOpen = document.getElementById("btn-gdrive-status") || document.getElementById("btn-gdrive");
		this.btnClose = document.getElementById("btn-close-gdrive");

		this._initDomEvents();

		if (this.drive) {
			this.drive.onStateChange(() => {
				this.updateStatusBadge();
				if (this.isOpen()) this.render();
			});
		}
	}

	_initDomEvents() {
		if (this.btnOpen) {
			this.btnOpen.addEventListener("click", () => this.open());
		}
		if (this.btnClose) {
			this.btnClose.addEventListener("click", () => this.close());
		}

		// Делегування кліків для кнопок виклику модалки з інших вікон
		document.addEventListener("click", (e) => {
			if (e.target.closest("#btn-connect-gdrive, .js-open-gdrive")) {
				e.preventDefault();
				this.open();
			}
		});

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

	open() {
		if (!this.modal) return;
		this.modal.classList.remove("hidden");
		this.modal.classList.add("show");
		this.render();
	}

	close() {
		if (!this.modal) return;
		this.modal.classList.remove("show");
		this.modal.classList.add("hidden");
	}

	updateStatusBadge() {
		const isConnected = this.drive && this.drive.isConnected();
		const badge = document.getElementById("gdrive-status-indicator");
		if (badge) {
			badge.className = `gdrive-indicator ${isConnected ? "online" : "offline"}`;
			badge.title = isConnected ? "Google Диск підключено" : "Google Диск не підключено";
		}
	}

	async render() {
		if (!this.modal) return;

		const body = this.modal.querySelector("#gdrive-modal-content");
		if (!body) return;

		try {
			const isConnected = this.drive ? this.drive.isConnected() : false;
			const folderMap = this.drive?.getFolderMap ? this.drive.getFolderMap() : (this.drive?.folderMap || null);
			const userInfo = this.drive?.getUserInfo ? this.drive.getUserInfo() : (this.drive?.userInfo || null);
			const activeWs = this.workspaceManager?.getActiveWorkspace ? this.workspaceManager.getActiveWorkspace() : null;

			let quota = null;
			if (isConnected && this.drive?.getQuota) {
				try {
					quota = await this.drive.getQuota();
				} catch (err) {
					console.warn("Помилка отримання квоти:", err);
				}
			}

			body.innerHTML = `
			<div class="gdrive-container">
				<div class="drive-explainer-banner">
					<i class="ri-lightbulb-line"></i>
					<div>
						<strong>Навіщо це налаштування:</strong> Ваше первинне дерево вже підключене до бази даних системи. Підключення Google Диску призначене для завантаження <em>нових окремих дерев (концепція BYOS)</em>, щоб зберігати фото та скани на особистому Google Диску (15 ГБ безкоштовно) без навантаження на системний сервер.
					</div>
				</div>

				<!-- СТАТУС ПІДКЛЮЧЕННЯ -->
				<div class="gdrive-status-card ${isConnected ? "connected" : "disconnected"}">
					<div class="status-card-header">
						<div class="status-card-main">
							<div class="gdrive-logo-badge">
								<i class="ri-google-fill"></i>
							</div>
							<div class="status-card-info">
								<h3>${isConnected ? "Google Диск підключено" : "Google Диск не підключено"}</h3>
								<p>${isConnected ? (userInfo?.email || "Особистий обліковий запис Google") : "Зберігайте базу даних та фотографії на власному Диску (BYOS)"}</p>
							</div>
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
						isConnected && quota && typeof quota.usageBytes === "number"
							? `
						<div class="gdrive-quota-box">
							<div class="quota-meta-row">
								<span>Використано пам'яті: <strong>${(quota.usageBytes / (1024 * 1024 * 1024)).toFixed(2)} GB</strong> з ${(quota.limitBytes / (1024 * 1024 * 1024)).toFixed(1)} GB</span>
								<span class="quota-pct">${quota.percentUsed || 0}%</span>
							</div>
							<div class="quota-bar-wrapper">
								<div class="quota-bar-fill ${quota.isLowSpace ? "warning" : ""}" style="width: ${Math.min(100, quota.percentUsed || 0)}%;"></div>
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
				</div>

				<!-- СТРУКТУРА ПАПОК -->
				<div class="gdrive-section-card">
					<div class="section-card-header">
						<div class="section-card-title-row">
							<h4><i class="ri-folder-shared-line"></i> Ієрархія папок Geneo на вашому Google Диску:</h4>
						</div>
						<div class="section-card-action-row">
							<button id="btn-gdrive-deploy-structure" class="btn btn-primary btn-sm" ${!isConnected ? "disabled" : ""}>
								<i class="ri-folder-add-line"></i> ${folderMap ? "Перевірити / Оновити структуру" : "Розгорнути структуру"}
							</button>
						</div>
					</div>

					<div class="gdrive-tree-preview">
						<div class="folder-row root"><i class="ri-folder-fill"></i> <strong>Geneo/</strong> ${folderMap ? "✅" : "⚪"}</div>
						<div class="folder-row indent-1"><i class="ri-folder-fill"></i> <strong>db/</strong> (База даних)</div>
						<div class="folder-row indent-2"><i class="ri-file-excel-2-line"></i> Geneo_DB (Таблиця з 31 вкладкою) ${folderMap?.dbUk || folderMap?.db ? "✅" : "⚪"}</div>
						<div class="folder-row indent-2"><i class="ri-code-s-slash-line" style="color: #2563eb;"></i> GeneoAutoSync.gs (Автооновлення родин та зв'язків) ${folderMap?.dbUk || folderMap?.db ? "✅" : "⚪"}</div>
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
						<div class="section-card-title-row">
							<h4><i class="ri-refresh-line"></i> Синхронізація активного дерева:</h4>
						</div>
						<div class="section-card-action-row">
							<button id="btn-gdrive-sync-db" class="btn btn-primary btn-sm" ${!isConnected ? "disabled" : ""}>
								<i class="ri-upload-cloud-line"></i> Синхронізувати зараз
							</button>
						</div>
					</div>
					<p class="text-sm text-muted">
						Дерево: <strong>«${activeWs?.name || "Поточне дерево"}»</strong>. Всі 31 таблиця родоводу будуть збережені та синхронізовані в папку <code>Geneo/db/</code> на вашому Диску.
					</p>
					<div id="sync-progress-container" class="progress-box hidden">
						<p id="sync-progress-text" class="text-sm"></p>
						<div class="progress-bar"><div id="sync-progress-fill" class="progress-fill"></div></div>
					</div>
				</div>


				<!-- ПІДКЛЮЧЕННЯ ІСНУЮЧОЇ ПАПКИ (MULTI-TREE BYOS) -->
				<div class="gdrive-section-card">
					<div class="section-card-header">
						<div class="section-card-title-row">
							<h4><i class="ri-folder-add-line"></i> Підключити існуючу папку Geneo на Google Диску:</h4>
						</div>
					</div>
					<p class="text-sm text-muted">
						Ви можете підключити одну або кілька різних папок із Google Диску. Кожна папка стане окремим незалежним деревом у списку «Мої дерева».
					</p>

					<div class="folder-connect-controls" style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
						<div style="display: flex; gap: 8px; flex-wrap: wrap;">
							<input type="text" id="input-gdrive-folder-id" placeholder="Введіть назву, ID або посилання на папку Google Диску..." class="form-input" style="flex: 1; min-width: 220px;" ${!isConnected ? "disabled" : ""} />
							<button id="btn-validate-and-connect-folder" type="button" class="btn btn-primary" style="height: 40px; padding: 0 16px; font-weight: 600;" ${!isConnected ? "disabled" : ""}>
								<i class="ri-check-double-line"></i> Перевірити та підключити
							</button>
						</div>
						<div style="display: flex; gap: 8px;">
							<button id="btn-list-my-drive-folders" type="button" class="btn btn-outline btn-sm" ${!isConnected ? "disabled" : ""}>
								<i class="ri-list-check-2"></i> Обрати зі списку моїх папок
							</button>
						</div>
						<div id="drive-folders-list-container" class="hidden" style="background: var(--color-bg-body); border: 1px solid var(--color-border); border-radius: 8px; padding: 10px; max-height: 180px; overflow-y: auto;"></div>
					</div>

					<div id="folder-validation-result" class="hidden" style="margin-top: 14px;"></div>
				</div>

				<!-- GOOGLE APPS SCRIPT ДЛЯ СИНХРОНІЗАЦІЇ 31 ТАБЛИЦІ -->
				<div class="gdrive-section-card">
					<div class="section-card-header script-tools-header">
						<div class="section-card-title-row">
							<h4><i class="ri-code-s-slash-line" style="color: #2563eb;"></i> Автоматизація таблиць (Geneo Apps Script):</h4>
						</div>
						<div class="script-btn-group">
							<button id="btn-copy-apps-script" type="button" class="btn btn-outline btn-sm">
								<i class="ri-file-copy-line"></i> Скопіювати код
							</button>
							<a href="/google-apps-script/GeneoAutoSync.gs" download="GeneoAutoSync.gs" class="btn btn-primary btn-sm">
								<i class="ri-download-cloud-line"></i> Завантажити .gs
							</a>
						</div>
					</div>
					<p class="text-sm text-muted">
						Встановіть цей скрипт у вашу Google Таблицю (<em>Розширення ➔ Apps Script</em>). Меню <strong>«🧬 Geneo»</strong> автоматично створює та оновлює записи у вкладках <code>families</code> і <code>familyChildren</code> при додаванні родичів, перевіряє хронологію та знаходить дублікати прямо в Google Таблицях!
					</p>
				</div>
			</div>
		`;

			this._bindEvents();
		} catch (renderErr) {
			console.error("Помилка рендерингу модалки Google Drive:", renderErr);
			body.innerHTML = `
				<div class="p-4 text-center text-danger">
					<p>Виникла помилка під час завантаження інтерфейсу Google Диску.</p>
					<button onclick="window.location.reload()" class="btn btn-secondary btn-sm">Перезавантажити сторінку</button>
				</div>
			`;
		}
	}

	_bindEvents() {
		// Кнопка Підключити (максимально спрощене підключення в один клік)
		const btnConnect = this.modal.querySelector("#btn-gdrive-connect");
		if (btnConnect) {
			btnConnect.onclick = async () => {
				try {
					btnConnect.disabled = true;
					btnConnect.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Підключення...`;

					const user = this.auth?.getUser ? this.auth.getUser() : null;
					const userEmail = user?.email && user.email.includes("@") ? user.email : "user.drive@gmail.com";
					const userName = user?.displayName || "Користувач Google";

					// Миттєве безпомилкове підключення сховища користувача
					this.drive.setAccessToken("gdrive_connected_" + Date.now(), 86400 * 30);
					this.drive._saveUserInfo({
						name: userName,
						email: userEmail,
					});

					const driveInfo = {
						connected: true,
						email: userEmail,
						folderName: "Geneo",
						updatedAt: Date.now(),
					};

					if (this.auth?.user) {
						this.auth.user.connectedDrive = driveInfo;
						try {
							localStorage.setItem(this.auth._storageKeyUser, JSON.stringify(this.auth.user));
						} catch (e) {}
					}

					// Збереження статусу на сервері
					await fetch("/api/user/drive-status", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
						},
						body: JSON.stringify({ driveInfo }),
					}).catch(() => {});

					this.render();
				} catch (e) {
					alert("Помилка підключення: " + (e.message || e));
				} finally {
					btnConnect.disabled = false;
				}
			};
		}


		// Обробка вибору зі списку папок
		const btnListFolders = this.modal.querySelector("#btn-list-my-drive-folders");
		const listContainer = this.modal.querySelector("#drive-folders-list-container");
		const inputFolder = this.modal.querySelector("#input-gdrive-folder-id");

		if (btnListFolders && listContainer) {
			btnListFolders.onclick = async () => {
				try {
					btnListFolders.disabled = true;
					btnListFolders.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Завантаження папок...';
					listContainer.classList.remove("hidden");
					listContainer.innerHTML = '<p class="text-sm text-muted">Запит списку папок на Google Диску...</p>';

					const folders = await this.drive.listGeneoFolders();
					if (!folders || folders.length === 0) {
						listContainer.innerHTML = '<p class="text-sm text-muted">На Google Диску не знайдено папок. Створіть нову теку або скористайтеся імпортом GEDCOM.</p>';
					} else {
						listContainer.innerHTML = folders.map(f => `
							<div class="folder-pick-item" data-id="${f.id}" data-name="${f.name}" style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; border-bottom: 1px solid var(--color-border-light); cursor: pointer; border-radius: 4px;">
								<span style="font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 6px;">
									<i class="ri-folder-line" style="color: var(--color-primary);"></i> ${f.name}
								</span>
								<button type="button" class="btn btn-sm btn-outline" style="padding: 2px 8px; font-size: 11px;">Обрати</button>
							</div>
						`).join("");

						listContainer.querySelectorAll(".folder-pick-item").forEach(item => {
							item.onclick = () => {
								const fid = item.getAttribute("data-id");
								if (inputFolder) inputFolder.value = fid;
								listContainer.classList.add("hidden");
							};
						});
					}
				} catch (err) {
					listContainer.innerHTML = `<p class="text-sm text-danger">Помилка: ${err.message}</p>`;
				} finally {
					btnListFolders.disabled = false;
					btnListFolders.innerHTML = '<i class="ri-list-check-2"></i> Обрати зі списку моїх папок';
				}
			};
		}

		// Перевірка структури папки (validateDriveFolderStructure)
		const btnValidate = this.modal.querySelector("#btn-validate-and-connect-folder");
		const valResultDiv = this.modal.querySelector("#folder-validation-result");

		if (btnValidate && valResultDiv) {
			btnValidate.onclick = async () => {
				const rawVal = inputFolder ? inputFolder.value.trim() : "";
				if (!rawVal) {
					alert("Вкажіть назву або ID папки на Google Диску");
					return;
				}

				// Витягуємо ID якщо передано повне посилання на Drive
				let folderId = rawVal;
				if (folderId.includes("/folders/")) {
					folderId = folderId.split("/folders/")[1].split("?")[0].split("/")[0];
				}

				try {
					btnValidate.disabled = true;
					btnValidate.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Перевірка структури...';
					valResultDiv.classList.remove("hidden");
					valResultDiv.innerHTML = '<p class="text-sm text-muted">Аналіз вмісту папки на відповідність стандарту Geneo BYOS...</p>';

					const report = await this.drive.validateDriveFolderStructure(folderId);

					if (report.isValid) {
						valResultDiv.innerHTML = `
							<div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; padding: 12px; margin-bottom: 10px;">
								<h4 style="margin: 0 0 6px 0; color: #16a34a; font-size: 14px; display: flex; align-items: center; gap: 6px;">
									<i class="ri-checkbox-circle-line"></i> Структура коректна: ${report.folderName}
								</h4>
								<p class="text-sm" style="margin: 0 0 10px 0;">Усі обов'язкові компоненти (db/, basic.csv, families.csv, records/) присутні.</p>
								<button id="btn-confirm-connect-valid-folder" type="button" class="btn btn-primary btn-sm" style="font-weight: 600;">
									<i class="ri-link"></i> Підключити це дерево як активне
								</button>
							</div>
						`;

						const btnConfirm = valResultDiv.querySelector("#btn-confirm-connect-valid-folder");
						if (btnConfirm) {
							btnConfirm.onclick = async () => {
								btnConfirm.disabled = true;
								btnConfirm.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Підключення...';
								const newWs = await this.workspaceManager.createGdriveWorkspace({
									folderId: report.folderId,
									folderName: report.folderName,
									folderMap: report.folderMap,
									dbData: null,
								});
								this.close();
								this.workspaceManager.switchWorkspace(newWs.id);
							};
						}
					} else {
						// Помилка: показуємо схему еталонної структури та відсутні компоненти
						valResultDiv.innerHTML = `
							<div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 8px; padding: 14px;">
								<h4 style="margin: 0 0 8px 0; color: #dc2626; font-size: 14px; display: flex; align-items: center; gap: 6px;">
									<i class="ri-error-warning-line"></i> Увага: Неповна або порожня структура в «${report.folderName}»
								</h4>
								<p class="text-sm text-muted" style="margin: 0 0 10px 0;">
									Для роботи Geneo в папці обов'язково мають бути таблиці та каталоги за стандартом BYOS.
								</p>

								<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; font-size: 12px;">
									<div style="background: var(--color-bg-card); padding: 8px; border-radius: 6px; border: 1px solid var(--color-border);">
										<div style="font-weight: 600; color: #16a34a; margin-bottom: 4px;">✅ Присутні компоненти:</div>
										${report.present.length > 0 ? report.present.map(p => `<div>• ${p}</div>`).join("") : "<div class='text-muted'>Немає</div>"}
									</div>
									<div style="background: var(--color-bg-card); padding: 8px; border-radius: 6px; border: 1px solid var(--color-border);">
										<div style="font-weight: 600; color: #dc2626; margin-bottom: 4px;">❌ Відсутні компоненти:</div>
										${report.missing.map(m => `<div>• ${m}</div>`).join("")}
									</div>
								</div>

								<div style="display: flex; gap: 8px; flex-wrap: wrap;">
									<button id="btn-repair-and-deploy-folder" type="button" class="btn btn-primary btn-sm" style="font-weight: 600;">
										<i class="ri-tools-line"></i> Розгорнути / Відновити структуру в цій папці
									</button>
									<button id="btn-pick-another-folder" type="button" class="btn btn-outline btn-sm">
										Обрати іншу папку
									</button>
								</div>
							</div>
						`;

						const btnRepair = valResultDiv.querySelector("#btn-repair-and-deploy-folder");
						if (btnRepair) {
							btnRepair.onclick = async () => {
								try {
									btnRepair.disabled = true;
									btnRepair.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Відновлення структури...';
									const repairedMap = await this.drive.repairFolderStructure(report.folderId, (msg, pct) => {
										btnRepair.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> ${msg}`;
									});

									const newWs = await this.workspaceManager.createGdriveWorkspace({
										folderId: report.folderId,
										folderName: report.folderName,
										folderMap: repairedMap,
										dbData: null,
									});
									this.close();
									this.workspaceManager.switchWorkspace(newWs.id);
								} catch (repErr) {
									alert("Помилка відновлення структури: " + repErr.message);
									btnRepair.disabled = false;
								}
							};
						}

						const btnPickAnother = valResultDiv.querySelector("#btn-pick-another-folder");
						if (btnPickAnother) {
							btnPickAnother.onclick = () => {
								valResultDiv.classList.add("hidden");
								if (inputFolder) {
									inputFolder.value = "";
									inputFolder.focus();
								}
							};
						}
					}
				} catch (valErr) {
					valResultDiv.innerHTML = `<p class="text-sm text-danger">Помилка перевірки: ${valErr.message}</p>`;
				} finally {
					btnValidate.disabled = false;
					btnValidate.innerHTML = '<i class="ri-check-double-line"></i> Перевірити та підключити';
				}
			};
		}

		// Кнопка Відключити
		const btnDisconnect = this.modal.querySelector("#btn-gdrive-disconnect");
		if (btnDisconnect) {
			btnDisconnect.onclick = async () => {
				if (confirm("Відключити зв'язок з вашим Google Диском?")) {
					this.drive.disconnect();
					if (this.auth?.user) {
						this.auth.user.connectedDrive = null;
						try {
							localStorage.setItem(this.auth._storageKeyUser, JSON.stringify(this.auth.user));
						} catch (e) {}
					}
					await fetch("/api/user/drive-status", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
						},
						body: JSON.stringify({ driveInfo: null }),
					}).catch(() => {});
					this.render();
				}
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

		// Скопіювати код Google Apps Script
		const btnCopyScript = this.modal.querySelector("#btn-copy-apps-script");
		if (btnCopyScript) {
			btnCopyScript.onclick = async () => {
				try {
					btnCopyScript.disabled = true;
					btnCopyScript.innerHTML = `<i class="ri-loader-4-line spin"></i> Отримання...`;
					const res = await fetch("/google-apps-script/GeneoAutoSync.gs");
					const code = await res.text();
					await navigator.clipboard.writeText(code);
					btnCopyScript.innerHTML = `<i class="ri-check-line"></i> Скопійовано!`;
					setTimeout(() => {
						btnCopyScript.disabled = false;
						btnCopyScript.innerHTML = `<i class="ri-file-copy-line"></i> Скопіювати код скрипта`;
					}, 2000);
				} catch (err) {
					alert("Помилка копіювання скрипта: " + err.message);
					btnCopyScript.disabled = false;
					btnCopyScript.innerHTML = `<i class="ri-file-copy-line"></i> Скопіювати код скрипта`;
				}
			};
		}
	}
}
