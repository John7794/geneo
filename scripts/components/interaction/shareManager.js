import { UI_CLASSES } from "../../core/uiClasses.js";

export class ShareManager {
	constructor(app) {
		this.app = app;
		this.overlay = document.getElementById("share-overlay");
		this.btnOpen = document.getElementById("btn-share");
		this.btnClose = document.getElementById("btn-close-share");
		this.btnCancel = document.getElementById("btn-cancel-share");
		this.btnSubmit = document.getElementById("btn-submit-share");
		this.emailInput = document.getElementById("share-email-input");

		this.isOpen = false;

		this.open = this.open.bind(this);
		this.close = this.close.bind(this);
		this.handleInput = this.handleInput.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);

		this.init();
	}

	init() {
		if (!this.overlay) return;

		if (this.btnOpen) {
			// There might be a cloned button like help-btn, so we will use delegation in main.js if needed, or bind directly
			this.btnOpen.addEventListener("click", this.open);
		}
		
		if (this.btnClose) this.btnClose.addEventListener("click", this.close);
		if (this.btnCancel) this.btnCancel.addEventListener("click", this.close);
		
		if (this.emailInput) {
			this.emailInput.addEventListener("input", this.handleInput);
		}

		if (this.btnSubmit) {
			this.btnSubmit.addEventListener("click", this.handleSubmit);
		}
	}

	handleInput(e) {
		const val = e.target.value.trim();
		const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
		if (this.btnSubmit) {
			this.btnSubmit.disabled = !isValidEmail;
		}
	}

	async handleSubmit(e) {
		e.preventDefault();
		if (!this.btnSubmit || this.btnSubmit.disabled) return;
		
		const originalText = this.btnSubmit.textContent;
		const email = this.emailInput.value.trim();
		
		this.btnSubmit.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Надсилання...';
		this.btnSubmit.disabled = true;
		this.emailInput.disabled = true;

		// Default permissions: no hidden profiles, cannot share or sync
		const hiddenProfiles = [];
		const canShare = false;
		const canSync = false;

		try {
			const res = await fetch("/api/invite", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, hiddenProfiles, canShare, canSync }),
			});
			
			const data = await res.json();
			
			if (res.ok) {
				this.btnSubmit.innerHTML = '<i class="ri-check-line"></i> ' + (data.mock ? 'Імітація успішна (введіть SMTP)' : 'Запрошення надіслано!');
				this.btnSubmit.classList.add("btn-success");
				this.btnSubmit.style.backgroundColor = "var(--color-success)";
				this.btnSubmit.style.borderColor = "var(--color-success)";
				this.btnSubmit.style.color = "#fff";
				
				this.loadActiveShares();
				
				setTimeout(() => {
					this.close();
					setTimeout(() => {
						if (this.emailInput) {
							this.emailInput.value = "";
							this.emailInput.disabled = false;
						}
						this.btnSubmit.textContent = originalText;
						this.btnSubmit.classList.remove("btn-success");
						this.btnSubmit.style = "";
						this.btnSubmit.disabled = true;
					}, 300);
				}, 2000);
			} else {
				throw new Error(data.error || 'Помилка надсилання');
			}
		} catch (error) {
			console.error("Помилка:", error);
			this.btnSubmit.innerHTML = '<i class="ri-error-warning-line"></i> Помилка';
			this.btnSubmit.style.backgroundColor = "var(--color-error)";
			this.btnSubmit.style.borderColor = "var(--color-error)";
			this.btnSubmit.style.color = "#fff";
			
			setTimeout(() => {
				this.btnSubmit.textContent = originalText;
				this.btnSubmit.style = "";
				this.btnSubmit.disabled = false;
				this.emailInput.disabled = false;
			}, 3000);
		}
	}

	open() {
		console.log("ShareManager.open() called", this.overlay, this.isOpen);
		if (!this.overlay || this.isOpen) return;
		this.isOpen = true;

		this.overlay.classList.remove("hidden");
		document.body.classList.add(UI_CLASSES.noScroll || "no-scroll");

		requestAnimationFrame(() => {
			this.overlay.classList.add("show");
			if (this.emailInput) this.emailInput.focus();
		});
		
		this.loadActiveShares();
	}

	async loadActiveShares() {
		const listContainer = document.getElementById("active-shares-list");
		if (!listContainer) return;
		
		listContainer.innerHTML = '<li style="color: var(--color-text-muted); font-size: 14px;">Завантаження...</li>';
		
		try {
			const res = await fetch('/api/shares');
			if (!res.ok) throw new Error("Failed connecting to API");
			const shares = await res.json();
			
			if (shares.length === 0) {
				listContainer.innerHTML = '<li style="color: var(--color-text-muted); font-size: 14px;">Немає наданих доступів</li>';
				return;
			}
			
			listContainer.innerHTML = shares.map(share => `
				<li style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--color-border-light);">
					<span style="font-size: 14px; color: var(--color-text-main);">${share.email}</span>
					<button class="btn btn-icon js-revoke-share" data-id="${share.id}" style="color: var(--color-error); padding: 4px;" title="Скасувати доступ">
						<i class="ri-delete-bin-line"></i>
					</button>
				</li>
			`).join("");
			
			const revokeBtns = listContainer.querySelectorAll('.js-revoke-share');
			revokeBtns.forEach(btn => {
				btn.addEventListener('click', async (e) => {
					e.preventDefault();
					const id = btn.getAttribute('data-id');
					if (confirm("Ви впевнені, що хочете скасувати доступ для цього користувача?")) {
						btn.disabled = true;
						try {
							const delRes = await fetch(`/api/shares/${id}`, { method: 'DELETE' });
							if (delRes.ok) {
								this.loadActiveShares();
							} else {
								alert("Не вдалося скасувати доступ.");
								btn.disabled = false;
							}
						} catch(err) {
							console.error(err);
							btn.disabled = false;
						}
					}
				});
			});
			
		} catch (e) {
			listContainer.innerHTML = '<li style="color: var(--color-error); font-size: 14px;">Помилка завантаження</li>';
			console.error("Помилка завантаження доступів:", e);
		}
	}

	close() {
		if (!this.overlay || !this.isOpen) return;
		this.isOpen = false;

		this.overlay.classList.remove("show");
		document.body.classList.remove(UI_CLASSES.noScroll || "no-scroll");

		setTimeout(() => {
			this.overlay.classList.add("hidden");
		}, 200);
	}
}
