// ./scripts/components/interaction/accountModalManager.js

/**
 * Керування інтерфейсом Особистого кабінету користувача
 */
export class AccountModalManager {
	constructor(authManager, workspaceManager, gedcomManager) {
		this.auth = authManager;
		this.workspaceManager = workspaceManager;
		this.gedcomManager = gedcomManager;

		this.modal = document.getElementById("account-modal");
		this.accountBtn = document.getElementById("btn-user-account");
		this.closeBtn = document.getElementById("btn-close-account");

		this.currentTab = "profile"; // profile | trees | sharing | drive

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
		if (!this.accountBtn) return;
		const user = this.auth.getUser();
		const initials = this.auth.getUserInitials();

		const avatarEl = this.accountBtn.querySelector(".account-pill-avatar");
		const nameEl = this.accountBtn.querySelector(".account-pill-name");

		if (avatarEl) avatarEl.textContent = initials;
		if (nameEl) {
			nameEl.textContent = user?.displayName || (this.auth.isAuthenticated ? "Мій профіль" : "Увійти");
		}
	}

	isOpen() {
		return this.modal && !this.modal.classList.contains("hidden");
	}

	open() {
		if (!this.modal) return;
		this.modal.classList.remove("hidden");
		this.render();
	}

	close() {
		if (!this.modal) return;
		this.modal.classList.add("hidden");
	}

	switchTab(tabName) {
		this.currentTab = tabName;
		this.render();
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

		if (avatarContainer) avatarContainer.textContent = initials;
		if (nameContainer) nameContainer.textContent = user?.displayName || "Користувач";
		if (emailContainer) emailContainer.textContent = user?.email || "local@geneo.app";

		if (roleContainer) {
			const role = user?.role || "owner";
			let roleBadge = "Власник";
			let roleClass = "badge-owner";
			if (user?.isMainAdmin || role === "admin") {
				roleBadge = "Адміністратор";
				roleClass = "badge-admin";
			} else if (role === "guest") {
				roleBadge = "Гість";
				roleClass = "badge-guest";
			}
			roleContainer.className = `account-role-badge ${roleClass}`;
			roleContainer.textContent = roleBadge;
		}

		// Підсвітка активної вкладки
		const tabs = this.modal.querySelectorAll(".account-tab-btn");
		tabs.forEach((tab) => {
			if (tab.getAttribute("data-tab") === this.currentTab) {
				tab.classList.add("active");
			} else {
				tab.classList.remove("active");
			}
		});

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
		}
	}

	_renderProfileTab(user) {
		const isAuth = this.auth.isAuthenticated;
		return `
			<div class="account-profile-section">
				<div class="account-info-grid">
					<div class="info-row">
						<span class="info-label">Повне ім'я:</span>
						<span class="info-value font-medium">${user?.displayName || "Не вказано"}</span>
					</div>
					<div class="info-row">
						<span class="info-label">Електронна пошта:</span>
						<span class="info-value">${user?.email || "Локальне сховище"}</span>
					</div>
					<div class="info-row">
						<span class="info-label">Статус сесії:</span>
						<span class="info-value">${isAuth ? "🟢 Авторизовано" : "⚪ Офлайн / Локальний режим"}</span>
					</div>
					<div class="info-row">
						<span class="info-label">Google Диск:</span>
						<span class="info-value">${user?.connectedDrive?.connected ? "🟢 Підключено" : "🟠 Не підключено (Локальне сховище IndexedDB)"}</span>
					</div>
				</div>

				<div class="account-actions-box">
					${
						isAuth
							? `<button id="btn-account-logout" class="btn btn-secondary account-logout-btn">
								<i class="ri-logout-box-r-line"></i> Вийти з облікового запису
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
										${ws.stats ? `<span>👥 ${ws.stats.persons || 0} осіб</span> • <span>💍 ${ws.stats.families || 0} сімей</span>` : "<span>Базове родинне дерево</span>"}
									</div>
								</div>
								<div class="tree-card-actions">
									${
										!isActive
											? `<button class="btn btn-sm btn-secondary js-account-switch-tree" data-id="${ws.id}">
												Відкрити
											</button>`
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
							<select id="share-input-role" class="form-input" style="max-width: 170px;">
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

				<div class="drive-structure-preview">
					<h4>Автоматична структура тек Geneo:</h4>
					<pre class="folder-tree-view">
📁 Geneo/
   ├── 📂 db/                      (31 таблиця баз даних)
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

				<div class="drive-connection-status">
					<div class="status-indicator">
						<span class="status-dot ${user?.connectedDrive?.connected ? "green" : "gray"}"></span>
						<span>Статус: <strong>${user?.connectedDrive?.connected ? "Підключено до Google Диску" : "Локальне сховище браузера (IndexedDB)"}</strong></span>
					</div>
					<button id="btn-connect-gdrive" class="btn btn-secondary">
						<i class="ri-google-fill"></i> ${user?.connectedDrive?.connected ? "Налаштування Google Диску" : "Підключити мій Google Диск"}
					</button>
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
	}

	_bindTreesEvents() {
		const addTreeBtn = this.modal.querySelector("#btn-account-add-tree");
		if (addTreeBtn) {
			addTreeBtn.onclick = () => {
				this.close();
				if (this.gedcomManager) this.gedcomManager.openModal();
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
	}

	_bindSharingEvents(canShare) {
		if (!canShare) {
			const importOwnBtn = this.modal.querySelector("#btn-sharing-import-own");
			if (importOwnBtn) {
				importOwnBtn.onclick = () => {
					this.close();
					if (this.gedcomManager) this.gedcomManager.openModal();
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

	_bindDriveEvents() {
		const connectBtn = this.modal.querySelector("#btn-connect-gdrive");
		if (connectBtn) {
			connectBtn.onclick = () => {
				alert(
					"Інтеграція з Google Диском (Крок 3): на наступному етапі ви зможете підключити свій Google OAuth та автоматично розвантажувати дані у власну папку Geneo!",
				);
			};
		}
	}
}
