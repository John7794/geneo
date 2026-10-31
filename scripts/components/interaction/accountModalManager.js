// ./scripts/components/interaction/accountModalManager.js

/**
 * Керування інтерфейсом Особистого кабінету користувача
 */
export class AccountModalManager {
	constructor(authManager, workspaceManager, gedcomManager, driveService = null, driveModalManager = null) {
		this.auth = authManager;
		this.workspaceManager = workspaceManager;
		this.gedcomManager = gedcomManager;
		this.drive = driveService;
		this.driveModalManager = driveModalManager;

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
			} else if (role === "guest") {
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
				<!-- Картка редагування профілю -->
				<div class="account-profile-card">
					<h4 class="profile-card-title"><i class="ri-user-settings-line"></i> Особисті дані дослідника</h4>
					<p class="text-sm text-muted">Вкажіть ваше ім'я та прізвище для відображення в системі та на генеалогічних деревах.</p>

					<div class="profile-name-form-group">
						<label for="input-account-display-name">Повне ім'я та прізвище:</label>
						<div class="profile-name-input-wrap">
							<input type="text" id="input-account-display-name" class="form-input" value="${user?.displayName || ""}" placeholder="Наприклад: Іван Селіванов" />
							<button id="btn-save-display-name" type="button" class="btn btn-primary">
								<i class="ri-check-line"></i> Зберегти
							</button>
						</div>
						<div id="name-save-feedback" class="name-save-feedback hidden"></div>
					</div>

					<div class="profile-avatar-actions">
						<label for="input-account-avatar-file" class="btn btn-secondary btn-sm" style="cursor: pointer;">
							<i class="ri-image-edit-line"></i> ${user?.avatar ? "Змінити фото аватарки" : "Завантажити фото аватарки"}
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
						<span class="info-value font-medium">${user?.isMainAdmin ? "👑 Головний адміністратор" : user?.role === "owner" ? "🌳 Власник дерева" : "👥 Гість"}</span>
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
						<span class="status-dot ${isDriveConnected ? "green" : "gray"}"></span>
						<span>Статус: <strong>${isDriveConnected ? "Підключено до Google Диску" : "Локальне сховище браузера (IndexedDB)"}</strong></span>
					</div>
					<button id="btn-connect-gdrive" class="btn btn-secondary">
						<i class="ri-google-fill"></i> ${isDriveConnected ? "Керування Google Диском" : "Підключити мій Google Диск"}
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

	setDriveModalManager(driveModalManager) {
		this.driveModalManager = driveModalManager;
	}

	_bindDriveEvents() {
		const connectBtn = this.modal.querySelector("#btn-connect-gdrive");
		if (connectBtn) {
			connectBtn.onclick = () => {
				this.close();
				if (this.driveModalManager) {
					this.driveModalManager.open();
				}
			};
		}
	}
}
