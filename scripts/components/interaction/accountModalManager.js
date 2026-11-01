// ./scripts/components/interaction/accountModalManager.js

import { TreeAuditService } from "../../services/treeAuditService.js";

/**
 * Керування інтерфейсом Особистого кабінету користувача
 */
export class AccountModalManager {
	constructor(authManager, workspaceManager, gedcomManager, driveService = null, driveModalManager = null, getEngine = null, onNavigatePerson = null) {
		this.auth = authManager;
		this.workspaceManager = workspaceManager;
		this.gedcomManager = gedcomManager;
		this.drive = driveService;
		this.driveModalManager = driveModalManager;
		this.getEngine = typeof getEngine === "function" ? getEngine : () => getEngine;
		this.onNavigatePerson = onNavigatePerson;

		this.modal = document.getElementById("account-modal");
		this.accountBtn = document.getElementById("btn-user-account");
		this.closeBtn = document.getElementById("btn-close-account");

		this.currentTab = "profile"; // profile | trees | sharing | drive | audit
		this.auditFilter = "all"; // all | duplicates | parentAnomalies | lifespanAnomalies | ignored
		this.auditPageLimit = 30;

		this._initDomEvents();
		this._syncAccountButton();

		this.auth.onAuthChange(() => {
			this._syncAccountButton();
			if (this.isOpen()) this.render();
		});
	}

	_initDomEvents() {
		if (this.accountBtn) {
			this.accountBtn.addEventListener("click", () => this.open());
		}
		if (this.closeBtn) {
			this.closeBtn.addEventListener("click", () => this.close());
		}

		// Делегування кліків для всіх кнопок кабінету у меню та інтерфейсі
		document.addEventListener("click", (e) => {
			if (e.target.closest("#btn-account-menu, #btn-user-account, .js-open-account")) {
				e.preventDefault();
				this.open();
			}
		});

		if (this.modal) {
			this.modal.addEventListener("click", (e) => {
				if (e.target === this.modal) this.close();
			});

			// Делегування кліків по вкладках
			this.modal.addEventListener("click", (e) => {
				const tabBtn = e.target.closest(".account-tab-btn");
				if (tabBtn) {
					const tab = tabBtn.getAttribute("data-tab");
					if (tab) this.switchTab(tab);
				}
			});
		}

		// Клавіша Escape для закриття
		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && this.isOpen()) {
				this.close();
			}
		});
	}

	_syncAccountButton() {
		const user = this.auth.getUser();
		const initials = this.auth.getUserInitials();

		if (this.accountBtn) {
			const avatarEl = this.accountBtn.querySelector(".account-pill-avatar");
			const nameEl = this.accountBtn.querySelector(".account-pill-name");

			if (avatarEl) {
				if (user?.avatar) {
					avatarEl.innerHTML = `<img src="${user.avatar}" class="toolbar-avatar-img" alt="Avatar" />`;
				} else {
					avatarEl.textContent = initials;
				}
			}
			if (nameEl) {
				nameEl.textContent = user?.displayName || (this.auth.isAuthenticated ? "Мій профіль" : "Увійти");
			}
		}

		const menuBtn = document.getElementById("btn-account-menu");
		if (menuBtn) {
			menuBtn.title = user ? `${user.displayName || user.email} (Особистий кабінет)` : "Особистий кабінет";
			if (user?.avatar) {
				menuBtn.innerHTML = `<img src="${user.avatar}" class="toolbar-avatar-img" alt="Avatar" />`;
			} else {
				menuBtn.innerHTML = `<i class="ri-user-settings-line"></i>`;
			}
		}
	}

	isOpen() {
		return this.modal && this.modal.classList.contains("show") && !this.modal.classList.contains("hidden");
	}

	open() {
		if (!this.modal) return;
		this.modal.classList.remove("hidden");
		this.modal.classList.add("show");
		this.updateAuditBadge();
		this.render();
	}

	close() {
		if (!this.modal) return;
		this.modal.classList.remove("show");
		this.modal.classList.add("hidden");
	}

	switchTab(tabName) {
		this.currentTab = tabName;
		this.render();
		this._centerActiveTab();
	}

	_centerActiveTab() {
		if (!this.modal) return;
		requestAnimationFrame(() => {
			const activeTab = this.modal.querySelector(`.account-tab-btn[data-tab="${this.currentTab}"]`);
			if (activeTab) {
				activeTab.scrollIntoView({
					behavior: "smooth",
					block: "nearest",
					inline: "center",
				});
			}
		});
	}

	render() {
		if (!this.modal) return;
		const user = this.auth.getUser();
		const initials = this.auth.getUserInitials();
		const activeWs = this.workspaceManager.getActiveWorkspace();
		const canShare = this.workspaceManager.canShareCurrentWorkspace();

		// Оновлюємо заголовок картки
		const avatarContainer = this.modal.querySelector("#account-modal-avatar");
		const nameContainer = this.modal.querySelector("#account-modal-name");
		const emailContainer = this.modal.querySelector("#account-modal-email");
		const roleContainer = this.modal.querySelector("#account-modal-role");

		if (avatarContainer) {
			if (user?.avatar) {
				avatarContainer.innerHTML = `<img src="${user.avatar}" class="account-avatar-img" alt="Avatar" />`;
			} else {
				avatarContainer.textContent = initials;
			}
		}

		if (roleContainer) {
			const role = user?.role || "owner";
			let roleBadge = "Власник";
			let roleClass = "badge-owner";
			if (user?.isMainAdmin || role === "admin") {
				roleBadge = "Адміністратор";
				roleClass = "badge-admin";
			} else if (role === "editor") {
				roleBadge = "Редактор";
				roleClass = "badge-editor";
			} else if (role === "guest" || role === "viewer") {
				roleBadge = "Гість";
				roleClass = "badge-guest";
			}
			roleContainer.className = `account-role-badge ${roleClass}`;
			roleContainer.textContent = roleBadge;
		}

		if (nameContainer) {
			const roleHtml = roleContainer ? roleContainer.outerHTML : "";
			nameContainer.innerHTML = `${user?.displayName || "Користувач"} ${roleHtml}`;
		}
		if (emailContainer) emailContainer.textContent = user?.email || "local@geneo.app";

		// Підсвітка активної вкладки
		const tabs = this.modal.querySelectorAll(".account-tab-btn");
		tabs.forEach((tab) => {
			if (tab.getAttribute("data-tab") === this.currentTab) {
				tab.classList.add("active");
			} else {
				tab.classList.remove("active");
			}
		});
		this._centerActiveTab();

		// Рендеринг контенту поточної вкладки
		const contentContainer = this.modal.querySelector("#account-tab-content");
		if (!contentContainer) return;

		switch (this.currentTab) {
			case "profile":
				contentContainer.innerHTML = this._renderProfileTab(user);
				this._bindProfileEvents();
				break;
			case "trees":
				contentContainer.innerHTML = this._renderTreesTab(activeWs);
				this._bindTreesEvents();
				break;
			case "sharing":
				contentContainer.innerHTML = this._renderSharingTab(activeWs, canShare);
				this._bindSharingEvents(canShare);
				break;
			case "drive":
				contentContainer.innerHTML = this._renderDriveTab(user);
				this._bindDriveEvents();
				break;
			case "audit":
				contentContainer.innerHTML = this._renderAuditTab();
				this._bindAuditEvents();
				break;
		}
	}

	_renderProfileTab(user) {
		const isAuth = this.auth.isAuthenticated;
		const hasName = !!(user?.displayName && user.displayName.trim());
		const isDriveConnected = this.drive ? this.drive.isConnected() : !!user?.connectedDrive?.connected;
		return `
			<div class="account-profile-section">
				<!-- Картка редагування профілю -->
				<div class="account-profile-card">
					<h4 class="profile-card-title"><i class="ri-user-settings-line"></i> Особисті дані дослідника</h4>
					<p class="text-sm text-muted">Вкажіть ваше ім'я та прізвище для відображення в системі та на генеалогічних деревах.</p>

					<div class="profile-name-form-group">
						<label>Повне ім'я та прізвище:</label>
						${
							hasName
								? `
							<div class="profile-name-display-box" id="profile-name-display-box">
								<div class="profile-name-text-row">
									<span class="profile-name-value">${user?.displayName || ""}</span>
									<button id="btn-toggle-edit-name" type="button" class="btn btn-ghost btn-sm text-primary" title="Змінити ім'я">
										<i class="ri-edit-line"></i> Змінити
									</button>
								</div>
							</div>
							<div class="profile-name-input-wrap hidden" id="profile-name-edit-box">
								<input type="text" id="input-account-display-name" class="form-input" value="${user?.displayName || ""}" placeholder="Наприклад: Іван Селіванов" />
								<button id="btn-save-display-name" type="button" class="btn btn-primary">
									<i class="ri-check-line"></i> Зберегти
								</button>
								<button id="btn-cancel-edit-name" type="button" class="btn btn-secondary btn-sm">
									Скасувати
								</button>
							</div>
						`
								: `
							<div class="profile-name-input-wrap" id="profile-name-edit-box">
								<input type="text" id="input-account-display-name" class="form-input" value="" placeholder="Наприклад: Іван Селіванов" />
								<button id="btn-save-display-name" type="button" class="btn btn-primary">
									<i class="ri-check-line"></i> Зберегти
								</button>
							</div>
						`
						}
						<div id="name-save-feedback" class="name-save-feedback hidden"></div>
					</div>

					<div class="profile-avatar-actions">
						<label for="input-account-avatar-file" class="btn btn-secondary btn-sm" style="cursor: pointer;">
							<i class="ri-image-edit-line"></i> ${user?.avatar ? "Змінити фото" : "Додати фото"}
						</label>
						${
							user?.avatar
								? `<button id="btn-remove-avatar" type="button" class="btn btn-ghost btn-sm text-danger"><i class="ri-delete-bin-line"></i> Видалити фото</button>`
								: ""
						}
					</div>
				</div>

				<div class="account-info-grid">
					<div class="info-row">
						<span class="info-label">Повне ім'я в системі:</span>
						<span class="info-value font-medium" id="info-profile-display-name">${user?.displayName || "Не вказано"}</span>
					</div>
					<div class="info-row">
						<span class="info-label">Електронна пошта:</span>
						<span class="info-value">${user?.email || "Локальне сховище"}</span>
					</div>
					<div class="info-row">
						<span class="info-label">Роль у системі:</span>
						<span class="info-value font-medium">${user?.isMainAdmin ? "👑 Головний адміністратор" : user?.role === "owner" ? "🌳 Власник дерева" : user?.role === "editor" ? "✏️ Редактор" : "👥 Гість (Тільки перегляд)"}</span>
					</div>
					<div class="info-row">
						<span class="info-label">Статус сесії:</span>
						<span class="info-value">${isAuth ? "🟢 Авторизовано" : "⚪ Офлайн / Локальний режим"}</span>
					</div>
					<div class="info-row">
						<span class="info-label">Google Диск:</span>
						<span class="info-value">${isDriveConnected ? "🟢 Підключено" : "🟠 Не підключено (Локальне сховище IndexedDB)"}</span>
					</div>
				</div>

				<div class="account-actions-box">
					<button id="btn-account-delete" type="button" class="btn btn-secondary account-delete-btn" title="Повне видалення вашого кабінету">
						<i class="ri-delete-bin-line"></i> Видалити кабінет
					</button>
					${
						isAuth
							? `<button id="btn-account-logout" type="button" class="btn btn-secondary account-logout-btn">
								<i class="ri-logout-box-r-line"></i> Вийти з акаунту
							</button>`
							: `<a href="/login" class="btn btn-primary account-login-btn">
								<i class="ri-login-box-line"></i> Увійти або створити кабінет
							</a>`
					}
				</div>
			</div>
		`;
	}

	_renderTreesTab(activeWs) {
		const allTrees = this.workspaceManager.getWorkspaces();
		const engine = typeof this.getEngine === "function" ? this.getEngine() : null;
		return `
			<div class="account-trees-section">
				<div class="trees-header-row">
					<p class="section-desc">Керуйте своїми родинними деревами або додайте нове через файл GEDCOM.</p>
					<button id="btn-account-add-tree" class="btn btn-primary btn-sm">
						<i class="ri-add-line"></i> Додати дерево (GEDCOM)
					</button>
				</div>

				<div class="account-trees-list">
					${allTrees
						.map((ws) => {
							const isActive = ws.id === activeWs?.id;
							let statsText = "<span>Базове родинне дерево</span>";
							if (ws.stats?.persons || ws.stats?.families) {
								statsText = `<span>👥 ${ws.stats.persons || 0} осіб</span> • <span>💍 ${ws.stats.families || 0} сімей</span>`;
							} else if (isActive && engine?.people?.length) {
								statsText = `<span>👥 ${engine.people.length} осіб</span> • <span>💍 ${engine.familyList ? engine.familyList.length : 0} сімей</span>`;
							} else if (ws.id === "bundled_author") {
								statsText = `<span>👥 2453 осіб</span> • <span>💍 1606 сімей</span>`;
							}

							return `
							<div class="account-tree-card ${isActive ? "active" : ""}">
								<div class="tree-card-main">
									<div class="tree-card-title-row">
										<span class="tree-card-title">${ws.name}</span>
										${isActive ? `<span class="badge-active">Активне</span>` : ""}
										<span class="tree-card-badge ${ws.isOwner ? "badge-owner" : "badge-guest"}">
											${ws.isOwner ? "Власник" : "Гість"}
										</span>
									</div>
									<div class="tree-card-meta">
										${statsText}
									</div>
								</div>
								<div class="tree-card-actions">
									${
										!isActive
											? `<button class="btn btn-sm btn-secondary js-account-switch-tree" data-id="${ws.id}">
												Відкрити
											</button>
											${
												ws.id !== "bundled_author"
													? `<button class="btn btn-sm btn-outline text-danger js-account-delete-tree" data-id="${ws.id}" title="Видалити дерево">
														<i class="ri-delete-bin-line"></i>
													</button>`
													: ""
											}`
											: `<span class="text-muted text-sm">Відкрито</span>`
									}
								</div>
							</div>
						`;
						})
						.join("")}
				</div>
			</div>
		`;
	}

	_renderSharingTab(activeWs, canShare) {
		if (!canShare) {
			return `
				<div class="account-sharing-restricted">
					<div class="restricted-icon"><i class="ri-shield-keyhole-line"></i></div>
					<h3>Спільний доступ обмежено</h3>
					<p class="restricted-desc">
						Ви переглядаєте дерево <strong>«${activeWs?.name || "Дерево автора"}»</strong> у режимі гостя.
					</p>
					<div class="restricted-notice">
						<i class="ri-information-line"></i>
						<span>Згідно з правилами безпеки платформи Geneo, надавати доступ іншим особам може виключно первинний Власник цього дерева.</span>
					</div>
					<div class="restricted-action">
						<p>Бажаєте мати власне дерево, яким зможете ділитися з родичами?</p>
						<button id="btn-sharing-import-own" class="btn btn-primary">
							<i class="ri-file-upload-line"></i> Завантажити своє дерево (GEDCOM)
						</button>
					</div>
				</div>
			`;
		}

		return `
			<div class="account-sharing-active">
				<p class="section-desc">
					Ви є <strong>Власником</strong> дерева <strong>«${activeWs?.name}»</strong> і маєте повні права надання доступу родичам та друзям.
				</p>

				<div class="sharing-form-card">
					<h4>Запросити до дерева:</h4>
					<form id="account-share-form" class="share-inline-form">
						<div class="form-inputs-row">
							<input type="email" id="share-input-email" placeholder="Email родича..." required class="form-input" />
							<select id="share-input-role" class="form-input">
								<option value="viewer">Тільки перегляд</option>
								<option value="editor">Редактор</option>
							</select>
							<button type="submit" class="btn btn-primary">
								<i class="ri-user-add-line"></i> Надати доступ
							</button>
						</div>
					</form>
				</div>

				<div class="shared-users-box">
					<h4>Користувачі з доступом до вашого дерева:</h4>
					<div id="account-shared-list" class="shared-list-loading">
						<p class="text-muted text-sm">Завантаження списку доступів...</p>
					</div>
				</div>
			</div>
		`;
	}

	_renderDriveTab(user) {
		const isDriveConnected = this.drive ? this.drive.isConnected() : !!user?.connectedDrive?.connected;
		return `
			<div class="account-drive-section">
				<div class="drive-header-card">
					<div class="drive-icon-box">
						<i class="ri-google-fill"></i>
					</div>
					<div class="drive-header-text">
						<h3>Особисте сховище Google Диск (BYOS)</h3>
						<p>Зберігайте всі таблиці та архівні фотографії на власному Google Диску без посередників.</p>
					</div>
				</div>

				<div class="drive-explainer-banner">
					<i class="ri-lightbulb-line"></i>
					<div>
						<strong>Навіщо ця вкладка?</strong> Ваше первинне родинне дерево вже підключене до бази даних системи. Підключення особистого Google Диску необхідне в концепції <em>BYOS (Bring Your Own Storage)</em>, якщо ви або ваші користувачі створюєте <strong>нове окреме дерево</strong> і бажаєте зберігати важкі архівні фото та скани на власному безкоштовному Google Диску (15 ГБ), не навантажуючи сервер проєкту.
					</div>
				</div>

				<div class="drive-structure-preview">
					<h4>Автоматична структура тек Geneo:</h4>
					<pre class="folder-tree-view">
📁 Geneo/
   ├── 📂 db/                      (Єдина Google Таблиця з 31 вкладкою)
   └── 📂 records/                 (Архівні фото та документи)
       ├── 📂 family_photos/       (Сімейні фотографії)
       ├── 📂 portraits/           (Портрети персон)
       └── 📂 scans/               (Архівні скани)
           ├── 📂 awards/          (Нагороди та медалі)
           ├── 📂 confessions/     (Сповідальні розписи)
           ├── 📂 metrics/         (Метричні книги: народження, шлюб, смерть)
           └── 📂 military/        (Військові документи)
					</pre>
				</div>

				<div class="drive-connection-status single-row-layout">
					<div class="status-indicator">
						<span class="status-dot ${isDriveConnected ? "green" : "gray"}"></span>
						<span>Статус: <strong>${isDriveConnected ? "Підключено до Google Диску" : "Локальне сховище (IndexedDB)"}</strong></span>
					</div>
					<button id="btn-toggle-account-gdrive" type="button" class="btn ${isDriveConnected ? "btn-secondary" : "btn-primary"} btn-drive-single-row">
						<i class="ri-google-fill"></i>
						<span>${isDriveConnected ? "Відключити Google Диск" : "Підключити Google Диск"}</span>
					</button>
				</div>

				<!-- АВТОМАТИЗАЦІЯ ТАБЛИЦЬ ТА РОЗШИРЕНЕ КЕРУВАННЯ -->
				<div class="drive-tools-card" style="margin-top: 16px; padding: 16px; border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; background: var(--bg-card, #ffffff);">
					<div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;">
						<h4 style="margin: 0; font-size: 15px; display: flex; align-items: center; gap: 8px;">
							<i class="ri-code-s-slash-line" style="color: #2563eb;"></i> Автоматизація таблиць (Geneo Apps Script)
						</h4>
						<div style="display: flex; gap: 8px; flex-wrap: wrap;">
							<button id="btn-account-copy-script" type="button" class="btn btn-outline btn-sm">
								<i class="ri-file-copy-line"></i> Скопіювати код
							</button>
							<a href="/google-apps-script/GeneoAutoSync.gs" download="GeneoAutoSync.gs" class="btn btn-primary btn-sm">
								<i class="ri-download-cloud-line"></i> Завантажити .gs
							</a>
						</div>
					</div>
					<p class="text-sm text-muted" style="margin: 0 0 12px 0;">
						Встановіть фірмовий скрипт у вашу Google Таблицю для автоматичного оновлення зв'язків та повної інтеграції з Geneo.
					</p>
					<div style="border-top: 1px solid var(--border-color, #e2e8f0); padding-top: 12px; display: flex; justify-content: flex-end;">
						<button id="btn-account-open-drive-modal" type="button" class="btn btn-secondary btn-sm">
							<i class="ri-folder-shared-line"></i> Розгорнути структуру / Менеджер Google Диску
						</button>
					</div>
				</div>
			</div>
		`;
	}

	_bindProfileEvents() {
		const logoutBtn = this.modal.querySelector("#btn-account-logout");
		if (logoutBtn) {
			logoutBtn.onclick = () => {
				if (confirm("Ви дійсно бажаєте вийти з облікового запису?")) {
					this.auth.logout();
				}
			};
		}

		// Видалення кабінету
		const deleteBtn = this.modal.querySelector("#btn-account-delete");
		if (deleteBtn) {
			deleteBtn.onclick = async () => {
				if (confirm("Ви дійсно бажаєте видалити свій особистий кабінет? Усі збережені локальні налаштування буде скинуто.")) {
					deleteBtn.disabled = true;
					deleteBtn.innerHTML = `<i class="ri-loader-4-line spin"></i> Видалення...`;
					try {
						await this.auth.deleteAccount();
					} catch (e) {
						alert("Помилка видалення кабінету: " + (e.message || e));
						deleteBtn.disabled = false;
						deleteBtn.innerHTML = `<i class="ri-delete-bin-line"></i> Видалити кабінет`;
					}
				}
			};
		}

		// Перемикач відображення форми імені
		const toggleEditBtn = this.modal.querySelector("#btn-toggle-edit-name");
		const cancelEditBtn = this.modal.querySelector("#btn-cancel-edit-name");
		const displayBox = this.modal.querySelector("#profile-name-display-box");
		const editBox = this.modal.querySelector("#profile-name-edit-box");

		if (toggleEditBtn && editBox && displayBox) {
			toggleEditBtn.onclick = () => {
				displayBox.classList.add("hidden");
				editBox.classList.remove("hidden");
				const input = editBox.querySelector("#input-account-display-name");
				if (input) {
					input.focus();
					input.select();
				}
			};
		}

		if (cancelEditBtn && editBox && displayBox) {
			cancelEditBtn.onclick = () => {
				editBox.classList.add("hidden");
				displayBox.classList.remove("hidden");
			};
		}

		// Збереження імені
		const saveNameBtn = this.modal.querySelector("#btn-save-display-name");
		const nameInput = this.modal.querySelector("#input-account-display-name");
		const feedbackEl = this.modal.querySelector("#name-save-feedback");

		const handleSaveName = async () => {
			if (!nameInput) return;
			const newName = nameInput.value.trim();
			if (!newName) {
				if (feedbackEl) {
					feedbackEl.className = "name-save-feedback error";
					feedbackEl.textContent = "Будь ласка, вкажіть ваше ім'я.";
					feedbackEl.classList.remove("hidden");
				}
				return;
			}
			if (saveNameBtn) {
				saveNameBtn.disabled = true;
				saveNameBtn.innerHTML = `<i class="ri-loader-4-line spin"></i> Збереження...`;
			}
			try {
				await this.auth.updateProfile({ displayName: newName });
				if (feedbackEl) {
					feedbackEl.className = "name-save-feedback success";
					feedbackEl.textContent = "✅ Ім'я успішно збережено!";
					feedbackEl.classList.remove("hidden");
				}
				const infoNameEl = this.modal.querySelector("#info-profile-display-name");
				if (infoNameEl) infoNameEl.textContent = newName;
				this._syncAccountButton();
				this.render();
			} catch (err) {
				if (feedbackEl) {
					feedbackEl.className = "name-save-feedback error";
					feedbackEl.textContent = "Помилка збереження імені.";
					feedbackEl.classList.remove("hidden");
				}
			} finally {
				if (saveNameBtn) {
					saveNameBtn.disabled = false;
					saveNameBtn.innerHTML = `<i class="ri-check-line"></i> Зберегти`;
				}
			}
		};

		if (saveNameBtn) saveNameBtn.onclick = handleSaveName;
		if (nameInput) {
			nameInput.onkeydown = (e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					handleSaveName();
				}
			};
		}

		// Завантаження фото аватарки
		const avatarInput = this.modal.querySelector("#input-account-avatar-file");
		if (avatarInput) {
			avatarInput.onchange = (e) => {
				const file = e.target.files?.[0];
				if (!file) return;

				if (!file.type.startsWith("image/")) {
					alert("Будь ласка, оберіть файл зображення (JPG, PNG, WebP тощо).");
					return;
				}

				const reader = new FileReader();
				reader.onload = (loadEvt) => {
					const img = new Image();
					img.onload = async () => {
						const canvas = document.createElement("canvas");
						const maxDim = 256;
						let width = img.width;
						let height = img.height;
						if (width > height) {
							if (width > maxDim) {
								height = Math.round((height * maxDim) / width);
								width = maxDim;
							}
						} else {
							if (height > maxDim) {
								width = Math.round((width * maxDim) / height);
								height = maxDim;
							}
						}
						canvas.width = width;
						canvas.height = height;
						const ctx = canvas.getContext("2d");
						ctx.drawImage(img, 0, 0, width, height);
						const dataUrl = canvas.toDataURL("image/jpeg", 0.88);

						await this.auth.updateProfile({ avatar: dataUrl });
						this._syncAccountButton();
						this.render();
					};
					img.src = loadEvt.target.result;
				};
				reader.readAsDataURL(file);
			};
		}

		// Видалення аватарки
		const removeAvatarBtn = this.modal.querySelector("#btn-remove-avatar");
		if (removeAvatarBtn) {
			removeAvatarBtn.onclick = async () => {
				if (confirm("Видалити фото аватарки та повернути текстові ініціали?")) {
					await this.auth.updateProfile({ avatar: "" });
					this._syncAccountButton();
					this.render();
				}
			};
		}
	}

	_bindTreesEvents() {
		const addTreeBtn = this.modal.querySelector("#btn-account-add-tree");
		if (addTreeBtn) {
			addTreeBtn.onclick = () => {
				this.close();
				if (this.gedcomManager) {
					if (typeof this.gedcomManager.open === "function") this.gedcomManager.open();
					else if (typeof this.gedcomManager.openModal === "function") this.gedcomManager.openModal();
				}
			};
		}

		const switchBtns = this.modal.querySelectorAll(".js-account-switch-tree");
		switchBtns.forEach((btn) => {
			btn.onclick = async () => {
				const id = btn.getAttribute("data-id");
				if (id) {
					btn.textContent = "Завантаження...";
					await this.workspaceManager.switchWorkspace(id);
					this.close();
					window.location.reload();
				}
			};
		});

		const deleteBtns = this.modal.querySelectorAll(".js-account-delete-tree");
		deleteBtns.forEach((btn) => {
			btn.onclick = async () => {
				const id = btn.getAttribute("data-id");
				if (id && confirm("Ви дійсно бажаєте видалити це дерево зі свого сховища?")) {
					await this.workspaceManager.deleteWorkspace(id);
					this.render();
				}
			};
		});
	}

	_bindSharingEvents(canShare) {
		if (!canShare) {
			const importOwnBtn = this.modal.querySelector("#btn-sharing-import-own");
			if (importOwnBtn) {
				importOwnBtn.onclick = () => {
					this.close();
					if (this.gedcomManager) {
						if (typeof this.gedcomManager.open === "function") this.gedcomManager.open();
						else if (typeof this.gedcomManager.openModal === "function") this.gedcomManager.openModal();
					}
				};
			}
			return;
		}

		const shareForm = this.modal.querySelector("#account-share-form");
		if (shareForm) {
			shareForm.onsubmit = async (e) => {
				e.preventDefault();
				const email = this.modal.querySelector("#share-input-email").value;
				const role = this.modal.querySelector("#share-input-role").value;

				try {
					const res = await fetch("/api/invite", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
						},
						body: JSON.stringify({ email, canShare: role === "editor", canSync: false }),
					});
					if (res.ok) {
						alert(`Запрошення для ${email} успішно надіслано!`);
						this.modal.querySelector("#share-input-email").value = "";
						this._loadSharedList();
					} else {
						const err = await res.json().catch(() => ({}));
						alert(err.error || "Помилка запрошення");
					}
				} catch (err) {
					alert("Помилка з'єднання з сервером.");
				}
			};
		}

		this._loadSharedList();
	}

	async _loadSharedList() {
		const listContainer = this.modal.querySelector("#account-shared-list");
		if (!listContainer) return;

		try {
			const res = await fetch("/api/shares", {
				headers: {
					Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
				},
			});
			if (res.ok) {
				const shares = await res.json();
				if (!shares || shares.length === 0) {
					listContainer.innerHTML = `<p class="text-muted text-sm">Ще нікому не надано доступ до цього дерева.</p>`;
					return;
				}

				listContainer.innerHTML = `
					<div class="shared-users-table">
						${shares
							.map(
								(s) => `
							<div class="shared-user-row">
								<div class="shared-user-info">
									<i class="ri-mail-line"></i>
									<span>${s.email}</span>
									<span class="user-role-tag">${s.canShare ? "Редактор" : "Перегляд"}</span>
								</div>
								<button class="btn-revoke-share" data-id="${s.id}" title="Відкликати доступ">
									<i class="ri-delete-bin-line"></i>
								</button>
							</div>
						`,
							)
							.join("")}
					</div>
				`;

				// Обробник видалення доступу
				listContainer.querySelectorAll(".btn-revoke-share").forEach((btn) => {
					btn.onclick = async () => {
						const id = btn.getAttribute("data-id");
						if (id && confirm("Відкликати доступ для цього користувача?")) {
							await fetch(`/api/shares/${id}`, {
								method: "DELETE",
								headers: {
									Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
								},
							});
							this._loadSharedList();
						}
					};
				});
			} else {
				listContainer.innerHTML = `<p class="text-muted text-sm">Не вдалося завантажити список доступів.</p>`;
			}
		} catch (e) {
			listContainer.innerHTML = `<p class="text-muted text-sm">Режим локального дерева.</p>`;
		}
	}

	setDriveModalManager(driveModalManager) {
		this.driveModalManager = driveModalManager;
	}

	_bindDriveEvents() {
		const toggleBtn = this.modal.querySelector("#btn-toggle-account-gdrive");
		if (toggleBtn) {
			toggleBtn.onclick = async () => {
				const user = this.auth.getUser();
				const isDriveConnected = this.drive ? this.drive.isConnected() : !!user?.connectedDrive?.connected;

				if (isDriveConnected) {
					if (confirm("Відключити зв'язок з вашим Google Диском?")) {
						toggleBtn.disabled = true;
						toggleBtn.innerHTML = `<i class="ri-loader-4-line spin"></i> Відключення...`;
						try {
							if (this.drive) {
								this.drive.disconnect();
							}
							if (this.auth?.user) {
								this.auth.user.connectedDrive = null;
								localStorage.setItem(this.auth._storageKeyUser, JSON.stringify(this.auth.user));
							}
							await fetch("/api/user/drive-status", {
								method: "POST",
								headers: {
									"Content-Type": "application/json",
									Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
								},
								body: JSON.stringify({ driveInfo: null }),
							}).catch(() => {});
						} finally {
							this.render();
							if (this.driveModalManager) this.driveModalManager.updateStatusBadge();
						}
					}
				} else {
					toggleBtn.disabled = true;
					toggleBtn.innerHTML = `<i class="ri-loader-4-line spin"></i> Підключення...`;
					try {
						const userEmail = user?.email && user.email.includes("@") ? user.email : "user.drive@gmail.com";
						const userName = user?.displayName || "Користувач Google";

						if (this.drive) {
							this.drive.setAccessToken("gdrive_connected_" + Date.now(), 86400 * 30);
							this.drive._saveUserInfo({
								name: userName,
								email: userEmail,
							});
						}

						const driveInfo = {
							connected: true,
							email: userEmail,
							folderName: "Geneo",
							updatedAt: Date.now(),
						};

						if (this.auth?.user) {
							this.auth.user.connectedDrive = driveInfo;
							localStorage.setItem(this.auth._storageKeyUser, JSON.stringify(this.auth.user));
						}

						await fetch("/api/user/drive-status", {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
							},
							body: JSON.stringify({ driveInfo }),
						}).catch(() => {});

						if (this.driveModalManager) this.driveModalManager.updateStatusBadge();
					} catch (e) {
						alert("Помилка підключення Google Диску: " + (e.message || e));
					} finally {
						this.render();
					}
				}
			};
		}

		// Копіювання коду Apps Script
		const copyScriptBtn = this.modal.querySelector("#btn-account-copy-script");
		if (copyScriptBtn) {
			copyScriptBtn.onclick = async () => {
				try {
					copyScriptBtn.disabled = true;
					copyScriptBtn.innerHTML = `<i class="ri-loader-4-line spin"></i> Отримання...`;
					const res = await fetch("/google-apps-script/GeneoAutoSync.gs");
					const code = await res.text();
					await navigator.clipboard.writeText(code);
					copyScriptBtn.innerHTML = `<i class="ri-check-line"></i> Скопійовано!`;
					setTimeout(() => {
						copyScriptBtn.disabled = false;
						copyScriptBtn.innerHTML = `<i class="ri-file-copy-line"></i> Скопіювати код`;
					}, 2000);
				} catch (err) {
					alert("Помилка копіювання скрипта: " + err.message);
					copyScriptBtn.disabled = false;
					copyScriptBtn.innerHTML = `<i class="ri-file-copy-line"></i> Скопіювати код`;
				}
			};
		}

		// Відкриття розширеного модального вікна Google Диску
		const openModalBtn = this.modal.querySelector("#btn-account-open-drive-modal");
		if (openModalBtn) {
			openModalBtn.onclick = () => {
				this.close();
				if (this.driveModalManager) {
					this.driveModalManager.open();
				}
			};
		}
	}

	updateAuditBadge() {
		const engine = typeof this.getEngine === "function" ? this.getEngine() : null;
		if (!engine) return;

		const audit = TreeAuditService.runFullAudit(engine);
		const tabBadge = this.modal?.querySelector("#audit-tab-badge") || document.getElementById("audit-tab-badge");
		const secBadge = document.getElementById("audit-badge-secondary");

		if (tabBadge) {
			tabBadge.textContent = String(audit.totalActive);
			if (audit.totalActive > 0) {
				tabBadge.classList.remove("hidden");
			} else {
				tabBadge.classList.add("hidden");
			}
		}

		if (secBadge) {
			if (audit.totalActive > 0) {
				secBadge.classList.remove("hidden");
			} else {
				secBadge.classList.add("hidden");
			}
		}

		const mobileAuditBadge = document.getElementById("mobile-menu-badge-audit");
		if (mobileAuditBadge) {
			if (audit.totalActive > 0) {
				mobileAuditBadge.classList.remove("hidden");
			} else {
				mobileAuditBadge.classList.add("hidden");
			}
		}
	}

	_renderAuditTab() {
		const engine = typeof this.getEngine === "function" ? this.getEngine() : null;
		const audit = TreeAuditService.runFullAudit(engine);

		let itemsToShow = [];
		switch (this.auditFilter) {
			case "duplicates":
				itemsToShow = audit.duplicates;
				break;
			case "parentAnomalies":
				itemsToShow = audit.parentAnomalies;
				break;
			case "lifespanAnomalies":
				itemsToShow = audit.lifespanAnomalies;
				break;
			case "ignored":
				itemsToShow = audit.ignored;
				break;
			case "all":
			default:
				itemsToShow = audit.allActive;
				break;
		}

		const totalAvailable = itemsToShow.length;
		const sliced = itemsToShow.slice(0, this.auditPageLimit);
		const hasMore = totalAvailable > this.auditPageLimit;

		return `
			<div class="account-audit-section">
				<!-- СТАТИСТИЧНИЙ БАНЕР -->
				<div class="audit-summary-banner ${audit.totalActive === 0 ? "healthy" : "attention"}">
					<div class="audit-banner-icon">
						<i class="${audit.totalActive === 0 ? "ri-shield-check-line" : "ri-error-warning-line"}"></i>
					</div>
					<div class="audit-banner-info">
						<h4>${audit.totalActive === 0 ? "Родовід цілісний! Аномалій не виявлено" : `Виявлено зауважень щодо якості даних: ${audit.totalActive}`}</h4>
						<p>${
							audit.totalActive === 0
								? "Всі дати, вік батьків та родинні зв'язки узгоджені. Дублікатів не знайдено."
								: "Автоматична діагностика виявила потенційні дублікати, невідповідності віку батьків або хронологічні розбіжності."
						}</p>
					</div>
					<div class="audit-banner-actions">
						<button id="btn-audit-rescan" class="btn btn-outline btn-sm" title="Пересканувати родовід">
							<i class="ri-refresh-line"></i> Оновити аудит
						</button>
					</div>
				</div>

				<!-- ФІЛЬТРИ ЗА КАТЕГОРІЯМИ -->
				<div class="audit-filters-bar">
					<button type="button" class="audit-filter-pill ${this.auditFilter === "all" ? "active" : ""}" data-filter="all">
						Всі активні <span class="pill-count">${audit.totalActive}</span>
					</button>
					<button type="button" class="audit-filter-pill ${this.auditFilter === "duplicates" ? "active" : ""}" data-filter="duplicates">
						<i class="ri-user-shared-line"></i> Дублікати <span class="pill-count">${audit.duplicates.length}</span>
					</button>
					<button type="button" class="audit-filter-pill ${this.auditFilter === "parentAnomalies" ? "active" : ""}" data-filter="parentAnomalies">
						<i class="ri-parent-line"></i> Вік батьків <span class="pill-count">${audit.parentAnomalies.length}</span>
					</button>
					<button type="button" class="audit-filter-pill ${this.auditFilter === "lifespanAnomalies" ? "active" : ""}" data-filter="lifespanAnomalies">
						<i class="ri-time-line"></i> Хронологія & Вік <span class="pill-count">${audit.lifespanAnomalies.length}</span>
					</button>
					<button type="button" class="audit-filter-pill ${this.auditFilter === "ignored" ? "active" : ""}" data-filter="ignored">
						<i class="ri-eye-off-line"></i> Відхилені <span class="pill-count">${audit.ignored.length}</span>
					</button>
				</div>

				<!-- СПИСОК ЗАУВАЖЕНЬ -->
				<div class="audit-cards-list">
					${
						sliced.length === 0
							? `
						<div class="audit-empty-box">
							<i class="ri-checkbox-circle-line"></i>
							<p>У цій категорії зауважень не виявлено.</p>
						</div>
					`
							: sliced.map((item) => this._renderAuditCard(item)).join("")
					}
					${
						hasMore
							? `
						<div class="audit-load-more-box" style="text-align: center; padding: 14px 0;">
							<button type="button" id="btn-audit-load-more" class="btn btn-outline btn-sm" style="margin: 0 auto; display: inline-flex;">
								<i class="ri-arrow-down-line"></i> Показати ще 30 зауважень (залишилось ${totalAvailable - this.auditPageLimit})
							</button>
						</div>
					`
							: ""
					}
				</div>
			</div>
		`;
	}

	_renderAuditCard(item) {
		const isIgnored = this.auditFilter === "ignored";
		const isDup = item.type === "duplicate";

		let badgeClass = "badge-info";
		let badgeLabel = "Інформація";
		let badgeIcon = "ri-information-line";

		if (item.severity === "error") {
			badgeClass = "badge-error";
			badgeLabel = "Помилка";
			badgeIcon = "ri-error-warning-fill";
		} else if (item.severity === "warning") {
			badgeClass = "badge-warning";
			badgeLabel = "Попередження";
			badgeIcon = "ri-alert-fill";
		} else if (isDup) {
			badgeClass = "badge-dup";
			badgeLabel = `Потенційний дублікат (${item.score}% збіг)`;
			badgeIcon = "ri-user-shared-fill";
		}

		return `
			<div class="audit-card severity-${item.severity || "warning"}" id="audit-card-${item.id}">
				<div class="audit-card-header">
					<div class="audit-badge-wrap">
						<span class="audit-badge ${badgeClass}"><i class="${badgeIcon}"></i> ${badgeLabel}</span>
					</div>
					<h5 class="audit-card-title">${item.title}</h5>
				</div>
				<div class="audit-card-body">
					<p class="audit-desc">${item.description}</p>
					${
						isDup && item.personA && item.personB
							? `
						<div class="audit-compare-grid">
							<div class="audit-person-box">
								<span class="box-role">Особа 1 (ID: ${item.personA.id})</span>
								<strong>${item.personAName || item.personA.fullName || item.personA.name}</strong>
								<span class="box-meta">${item.personA.birthDate || item.personA.dates?.birth || "Рік народження невідомий"}</span>
							</div>
							<div class="audit-compare-arrow"><i class="ri-arrow-left-right-line"></i></div>
							<div class="audit-person-box">
								<span class="box-role">Особа 2 (ID: ${item.personB.id})</span>
								<strong>${item.personBName || item.personB.fullName || item.personB.name}</strong>
								<span class="box-meta">${item.personB.birthDate || item.personB.dates?.birth || "Рік народження невідомий"}</span>
							</div>
						</div>
						${
							item.reasons && item.reasons.length
								? `
							<div class="audit-reasons-wrap">
								<span class="reasons-label">Ознаки збігу:</span>
								<ul class="audit-reasons-list">
									${item.reasons.map((r) => `<li><i class="ri-check-line"></i> ${r}</li>`).join("")}
								</ul>
							</div>
						`
								: ""
						}
					`
							: ""
					}
				</div>
				<div class="audit-card-actions">
					${
						!isIgnored
							? isDup && item.personA && item.personB
								? `
								<button type="button" class="btn btn-primary btn-sm js-audit-fix" data-id="${item.personA.id}">
									<i class="ri-search-eye-line"></i> Переглянути Особу 1
								</button>
								<button type="button" class="btn btn-outline btn-sm js-audit-fix" data-id="${item.personB.id}">
									<i class="ri-search-eye-line"></i> Переглянути Особу 2
								</button>
								<button type="button" class="btn btn-ghost btn-sm text-muted js-audit-dismiss" data-issue-id="${item.id}" title="Відхилити та не показувати це зауваження">
									<i class="ri-close-line"></i> Відхилити
								</button>
							`
								: `
								<button type="button" class="btn btn-primary btn-sm js-audit-fix" data-id="${item.personId || item.person?.id}">
									<i class="ri-search-eye-line"></i> Виправити / Переглянути
								</button>
								<button type="button" class="btn btn-ghost btn-sm text-muted js-audit-dismiss" data-issue-id="${item.id}" title="Відхилити та не показувати це зауваження">
									<i class="ri-close-line"></i> Відхилити
								</button>
							`
							: `
							<button type="button" class="btn btn-outline btn-sm js-audit-restore" data-issue-id="${item.id}">
								<i class="ri-restart-line"></i> Відновити зауваження
							</button>
						`
					}
				</div>
			</div>
		`;
	}

	_bindAuditEvents() {
		// Перемикання фільтрів
		const filterPills = this.modal.querySelectorAll(".audit-filter-pill");
		filterPills.forEach((pill) => {
			pill.onclick = () => {
				const filter = pill.getAttribute("data-filter");
				if (filter) {
					this.auditFilter = filter;
					this.auditPageLimit = 30;
					this.render();
				}
			};
		});

		// Кнопка Показати ще
		const loadMoreBtn = this.modal.querySelector("#btn-audit-load-more");
		if (loadMoreBtn) {
			loadMoreBtn.onclick = () => {
				this.auditPageLimit += 30;
				this.render();
			};
		}

		// Кнопка Пересканувати
		const rescanBtn = this.modal.querySelector("#btn-audit-rescan");
		if (rescanBtn) {
			rescanBtn.onclick = () => {
				rescanBtn.disabled = true;
				rescanBtn.innerHTML = `<i class="ri-loader-4-line spin"></i> Оновлення...`;
				setTimeout(() => {
					this.updateAuditBadge();
					this.render();
				}, 200);
			};
		}

		// Кнопка Виправити / Переглянути
		const fixButtons = this.modal.querySelectorAll(".js-audit-fix");
		fixButtons.forEach((btn) => {
			btn.onclick = () => {
				const targetId = btn.getAttribute("data-id");
				if (targetId) {
					this.close();
					if (typeof this.onNavigatePerson === "function") {
						this.onNavigatePerson(targetId);
					}
				}
			};
		});

		// Кнопка Відхилити
		const dismissButtons = this.modal.querySelectorAll(".js-audit-dismiss");
		dismissButtons.forEach((btn) => {
			btn.onclick = () => {
				const issueId = btn.getAttribute("data-issue-id");
				if (issueId) {
					TreeAuditService.ignoreIssue(issueId);
					this.updateAuditBadge();
					const card = document.getElementById(`audit-card-${issueId}`);
					if (card) {
						card.style.transition = "all 0.25s ease";
						card.style.opacity = "0";
						card.style.transform = "scale(0.96)";
						setTimeout(() => this.render(), 250);
					} else {
						this.render();
					}
				}
			};
		});

		// Кнопка Відновити
		const restoreButtons = this.modal.querySelectorAll(".js-audit-restore");
		restoreButtons.forEach((btn) => {
			btn.onclick = () => {
				const issueId = btn.getAttribute("data-issue-id");
				if (issueId) {
					TreeAuditService.unignoreIssue(issueId);
					this.updateAuditBadge();
					this.render();
				}
			};
		});
	}
}
