// ./scripts/components/interaction/updateManager.js
import { UI_CLASSES } from "../../core/uiClasses.js";

export class UpdateManager {
	constructor(app) {
		this.app = app;
		this.isOpen = false;
		this.isSyncing = false;
		this.timerInterval = null;
		this.secondsElapsed = 0;

		this.open = this.open.bind(this);
		this.close = this.close.bind(this);
		this.startSync = this.startSync.bind(this);
		this._handleBackdropClick = this._handleBackdropClick.bind(this);
		this._handleEscape = this._handleEscape.bind(this);

		this._bindDom();
		this.init();
		window.updateManager = this;
	}

	_bindDom() {
		this.overlay = document.getElementById("update-data-overlay");
		this.btnOpen = document.getElementById("btn-update-data");
		this.btnClose = document.getElementById("btn-close-update-data");
		this.btnCancel = document.getElementById("btn-cancel-update-data");
		this.btnConfirm = document.getElementById("btn-confirm-update-data");
		this.btnCloseResult = document.getElementById("btn-close-update-result");

		this.promptState = document.getElementById("update-data-prompt-state");
		this.progressState = document.getElementById("update-data-progress-state");
		this.resultState = document.getElementById("update-data-result-state");
		this.timerDisplay = document.getElementById("update-data-timer-display");

		this.lastDateEl = document.getElementById("update-data-last-date");
		this.profileCountEl = document.getElementById("update-data-profile-count");

		this.resultIcon = document.getElementById("update-data-result-icon");
		this.resultTitle = document.getElementById("update-data-result-title");
		this.resultDesc = document.getElementById("update-data-result-desc");
		this.resultActions = document.getElementById("update-data-result-actions");
	}

	init() {
		document.addEventListener("click", (e) => {
			const btn = e.target.closest("#btn-update-data");
			if (btn) {
				e.preventDefault();
				e.stopPropagation();
				this.open();
				return;
			}

			const btnClose = e.target.closest("#btn-close-update-data, #btn-cancel-update-data, #btn-close-update-result");
			if (btnClose) {
				e.preventDefault();
				this.close();
				return;
			}

			const btnConfirm = e.target.closest("#btn-confirm-update-data");
			if (btnConfirm) {
				e.preventDefault();
				this.startSync();
				return;
			}

			if (this.overlay && e.target === this.overlay && !this.isSyncing) {
				this.close();
			}
		});

		document.addEventListener("keydown", this._handleEscape);
	}

	_handleBackdropClick(e) {
		if (e.target === this.overlay && !this.isSyncing) {
			this.close();
		}
	}

	_handleEscape(e) {
		if (e.key === "Escape" && this.isOpen && !this.isSyncing) {
			this.close();
		}
	}

	async loadStatus() {
		this._bindDom();
		try {
			const res = await fetch("/api/db-status?t=" + Date.now(), { cache: "no-store" });
			if (res.ok) {
				const data = await res.json();
				if (this.lastDateEl) {
					if (data.lastUpdated || data.timestamp) {
						const date = new Date(data.lastUpdated || data.timestamp);
						this.lastDateEl.textContent = date.toLocaleString("uk-UA", {
							day: "2-digit",
							month: "2-digit",
							year: "numeric",
							hour: "2-digit",
							minute: "2-digit"
						});
					} else {
						this.lastDateEl.textContent = "Базова версія";
					}
				}
				if (this.profileCountEl) {
					this.profileCountEl.textContent = data.profileCount ? `${data.profileCount} осіб` : "2 404 особи";
				}
			}
		} catch (err) {
			console.warn("⚠️ Could not load db status:", err);
		}
	}

	open() {
		this._bindDom();
		if (!this.overlay) {
			console.error("update-data-overlay not found in DOM");
			return;
		}
		this.isOpen = true;
		this.isSyncing = false;
		this._showState("prompt");
		this.overlay.classList.remove("hidden");
		this.overlay.classList.add("show", "open");
		this.overlay.setAttribute("aria-hidden", "false");
		document.body.classList.add(UI_CLASSES.noScroll || "no-scroll");
		this.loadStatus();
	}

	close() {
		if (this.isSyncing) return;
		this.isOpen = false;
		if (!this.overlay) this._bindDom();
		if (this.overlay) {
			this.overlay.classList.remove("show", "open");
			this.overlay.classList.add("hidden");
			this.overlay.setAttribute("aria-hidden", "true");
		}
		document.body.classList.remove(UI_CLASSES.noScroll || "no-scroll");
		this._stopTimer();
	}

	_showState(state) {
		this._bindDom();
		if (this.promptState) this.promptState.classList.toggle("hidden", state !== "prompt");
		if (this.progressState) this.progressState.classList.toggle("hidden", state !== "progress");
		if (this.resultState) this.resultState.classList.toggle("hidden", state !== "result");
		if (this.btnClose) this.btnClose.style.display = (state === "progress") ? "none" : "";
	}

	_startTimer() {
		this.secondsElapsed = 0;
		if (this.timerDisplay) this.timerDisplay.textContent = "Час: 0 с";
		this._stopTimer();
		this.timerInterval = setInterval(() => {
			this.secondsElapsed++;
			if (this.timerDisplay) {
				this.timerDisplay.textContent = `Час: ${this.secondsElapsed} с`;
			}
		}, 1000);
	}

	_stopTimer() {
		if (this.timerInterval) {
			clearInterval(this.timerInterval);
			this.timerInterval = null;
		}
	}

	async startSync() {
		if (this.isSyncing) return;
		this.isSyncing = true;
		this._showState("progress");
		this._startTimer();

		try {
			const token = localStorage.getItem("auth_token") || "";
			const response = await fetch("/api/sync-data", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(token ? { "Authorization": `Bearer ${token}` } : {})
				},
				credentials: "include"
			});

			const result = await response.json();
			this._stopTimer();

			if (!response.ok) {
				const errMsg = result.error || "Помилка сервера";
				const details = result.details ? ` (${result.details})` : "";
				throw new Error(errMsg + details);
			}

			// Успіх
			this._showState("result");
			if (this.resultIcon) {
				this.resultIcon.innerHTML = '<i class="ri-checkbox-circle-fill" style="color: #10b981; font-size: 52px;"></i>';
			}
			if (this.resultTitle) {
				this.resultTitle.textContent = "Дані успішно оновлено!";
			}
			if (this.resultDesc) {
				this.resultDesc.textContent = "Очищення кешу та оновлення сторінки...";
			}
			if (this.resultActions) {
				this.resultActions.classList.add("hidden");
			}

			// Повне очищення локального кешу браузера
			try {
				if (typeof localforage !== "undefined") {
					await localforage.clear();
				}
				sessionStorage.clear();
				if (typeof caches !== "undefined" && caches.keys) {
					const cacheNames = await caches.keys();
					for (const name of cacheNames) {
						await caches.delete(name);
					}
				}
				if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
					const registrations = await navigator.serviceWorker.getRegistrations();
					for (const reg of registrations) {
						await reg.unregister();
					}
				}
			} catch (cacheErr) {
				console.warn("⚠️ Cache clearing warning:", cacheErr);
			}

			// Примусове перезавантаження з унікальним параметром для обходу будь-якого кешу
			setTimeout(() => {
				const targetUrl = window.location.pathname + "?_t=" + Date.now();
				window.location.replace(targetUrl);
			}, 1200);

		} catch (error) {
			this.isSyncing = false;
			this._stopTimer();
			this._showState("result");
			if (this.resultIcon) {
				this.resultIcon.innerHTML = '<i class="ri-error-warning-fill" style="color: #ef4444; font-size: 52px;"></i>';
			}
			if (this.resultTitle) {
				this.resultTitle.textContent = "Помилка оновлення даних";
			}
			if (this.resultDesc) {
				this.resultDesc.textContent = error.message || "Не вдалося отримати оновлені дані з сервера.";
			}
			if (this.resultActions) {
				this.resultActions.classList.remove("hidden");
			}
		}
	}
}
