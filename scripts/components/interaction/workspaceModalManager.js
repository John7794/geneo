// ./scripts/components/interaction/workspaceModalManager.js

import { DEFAULT_AUTHOR_WORKSPACE_ID } from "../../services/workspaceManager.js";

export class WorkspaceModalManager {
	constructor(workspaceManager, gedcomManager) {
		this.workspaceManager = workspaceManager;
		this.gedcomManager = gedcomManager;
		this.overlay = document.getElementById("workspaces-overlay");
		this.listContainer = document.getElementById("workspaces-list");
		this.pillBtn = document.getElementById("active-tree-pill");
		this.menuTriggerBtn = document.getElementById("btn-workspaces");

		this._handleGlobalClick = this._handleGlobalClick.bind(this);
		this._handleKeyDown = this._handleKeyDown.bind(this);

		this.init();
	}

	init() {
		if (this.pillBtn) {
			this.pillBtn.addEventListener("click", () => this.open());
		}

		if (this.menuTriggerBtn) {
			this.menuTriggerBtn.addEventListener("click", () => this.open());
		}

		// Делегування кліків для кнопок відкриття модалки просторів
		document.addEventListener("click", (e) => {
			if (e.target.closest(".js-open-workspaces")) {
				e.preventDefault();
				this.open();
			}
		});

		if (this.overlay) {
			const closeBtn = this.overlay.querySelector(".js-close-popup");
			if (closeBtn) {
				closeBtn.addEventListener("click", () => this.close());
			}

			this.overlay.addEventListener("click", (e) => {
				if (e.target === this.overlay) this.close();
			});

			const btnNewTree = this.overlay.querySelector("#btn-ws-new-gedcom");
			if (btnNewTree) {
				btnNewTree.addEventListener("click", () => {
					this.close();
					if (this.gedcomManager) {
						this.gedcomManager.open();
					}
				});
			}
		}

		this.updatePillText();
	}

	updatePillText() {
		if (!this.pillBtn || !this.workspaceManager) return;
		const activeWs = this.workspaceManager.getActiveWorkspace();
		const nameSpan = this.pillBtn.querySelector(".tree-pill-name");
		if (nameSpan) {
			nameSpan.textContent = activeWs.name || "Дерево";
		}
		const iconEl = this.pillBtn.querySelector(".tree-pill-icon");
		if (iconEl) {
			iconEl.className = activeWs.id === DEFAULT_AUTHOR_WORKSPACE_ID
				? "ri-git-repository-line tree-pill-icon"
				: "ri-folder-user-line tree-pill-icon";
		}

		// Оновлюємо статус бейджа ролі на пігулці
		const roleBadge = this.pillBtn.querySelector(".tree-pill-badge");
		if (roleBadge) {
			if (activeWs.isOwner) {
				roleBadge.textContent = "Власник";
				roleBadge.className = "tree-pill-badge badge-owner";
			} else {
				roleBadge.textContent = "Гість";
				roleBadge.className = "tree-pill-badge badge-guest";
			}
		}
	}

	open() {
		if (!this.overlay) return;
		this.renderList();
		this.overlay.classList.remove("hidden");
		this.overlay.classList.add("show");
		this.overlay.setAttribute("aria-hidden", "false");
		document.addEventListener("keydown", this._handleKeyDown);
	}

	close() {
		if (!this.overlay) return;
		this.overlay.classList.remove("show");
		this.overlay.classList.add("hidden");
		this.overlay.setAttribute("aria-hidden", "true");
		document.removeEventListener("keydown", this._handleKeyDown);
	}

	_handleKeyDown(e) {
		if (e.key === "Escape") this.close();
	}

	_handleGlobalClick(e) {
		if (e.target === this.overlay) this.close();
	}

	renderList() {
		if (!this.listContainer || !this.workspaceManager) return;

		const workspaces = this.workspaceManager.listWorkspaces();
		const activeWs = this.workspaceManager.getActiveWorkspace();

		this.listContainer.innerHTML = workspaces
			.map((ws) => {
				const isActive = ws.id === activeWs.id;
				const isAuthor = ws.id === DEFAULT_AUTHOR_WORKSPACE_ID;
				const pCount = ws.personsCount ? ws.personsCount.toLocaleString() : "2 417";
				const fCount = ws.familiesCount ? ws.familiesCount.toLocaleString() : "1 606";

				return `
					<div class="ws-card ${isActive ? "ws-card--active" : ""}" data-ws-id="${ws.id}">
						<div class="ws-card-header">
							<div class="ws-card-title-group">
								<i class="${isAuthor ? "ri-git-repository-fill" : "ri-folder-user-fill"} ws-card-icon"></i>
								<div>
									<h4 class="ws-card-title">${escapeHtml(ws.name)}</h4>
									<div class="ws-card-meta">
										<span class="ws-badge ${ws.isOwner ? "ws-badge--owner" : "ws-badge--guest"}">
											${ws.isOwner ? '<i class="ri-shield-user-line"></i> Власник' : '<i class="ri-eye-line"></i> Гість (Тільки перегляд)'}
										</span>
										<span class="ws-stat-item"><i class="ri-user-line"></i> ${pCount} осіб</span>
										<span class="ws-stat-item"><i class="ri-parent-line"></i> ${fCount} сімей</span>
									</div>
								</div>
							</div>
							<div class="ws-card-actions">
								${isActive
									? '<span class="ws-active-pill"><i class="ri-checkbox-circle-fill"></i> Активне</span>'
									: `<button class="btn btn-sm btn-primary js-switch-ws" data-id="${ws.id}">
										<i class="ri-check-line"></i> Відкрити
									   </button>`
								}
								${!isAuthor
									? `<button class="btn btn-sm btn-icon btn-danger-ghost js-delete-ws" data-id="${ws.id}" title="Видалити дерево" aria-label="Видалити дерево">
										<i class="ri-delete-bin-line"></i>
									   </button>`
									: ""
								}
							</div>
						</div>
						<div class="ws-card-desc">
							${escapeHtml(ws.description || (isAuthor ? "Основне родинне дерево автора" : `Початкова особа: ${ws.probandName || "Пробанд"}`))}
						</div>
					</div>
				`;
			})
			.join("");

		// Обробка перемикання
		this.listContainer.querySelectorAll(".js-switch-ws").forEach((btn) => {
			btn.addEventListener("click", () => {
				const id = btn.getAttribute("data-id");
				if (id) {
					this.workspaceManager.switchWorkspace(id);
				}
			});
		});

		// Обробка видалення
		this.listContainer.querySelectorAll(".js-delete-ws").forEach((btn) => {
			btn.addEventListener("click", async () => {
				const id = btn.getAttribute("data-id");
				if (id && confirm("Ви дійсно бажаєте видалити це локальне дерево зі свого сховища?")) {
					await this.workspaceManager.deleteWorkspace(id);
					this.renderList();
					this.updatePillText();
				}
			});
		});
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
