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

		// Calculate hidden profiles based on unchecked checkboxes
		const hiddenProfiles = [];
		try {
			const isPaternalFChecked = document.getElementById("share-branch-paternal-f")?.checked ?? true;
			const isPaternalMChecked = document.getElementById("share-branch-paternal-m")?.checked ?? true;
			const isMaternalFChecked = document.getElementById("share-branch-maternal-f")?.checked ?? true;
			const isMaternalMChecked = document.getElementById("share-branch-maternal-m")?.checked ?? true;

			const ahnentafelMap = this.app?.managers?.lineage?.logic?.ahnentafelMap;
			if (ahnentafelMap) {
				for (const [id, data] of ahnentafelMap.entries()) {
					const branches = data.branches;
					if (!isPaternalFChecked && branches.has(4)) {
						hiddenProfiles.push(id);
					} else if (!isPaternalMChecked && branches.has(5)) {
						hiddenProfiles.push(id);
					} else if (!isMaternalFChecked && branches.has(6)) {
						hiddenProfiles.push(id);
					} else if (!isMaternalMChecked && branches.has(7)) {
						hiddenProfiles.push(id);
					}
				}
			}
			console.log("[Invite] Calculated hidden profiles count:", hiddenProfiles.length, hiddenProfiles);
		} catch (err) {
			console.error("[Invite] Error calculating hidden profiles:", err);
		}

		try {
			const res = await fetch("/api/invite", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, hiddenProfiles }),
			});
			
			const data = await res.json();
			
			if (res.ok) {
				this.btnSubmit.innerHTML = '<i class="ri-check-line"></i> ' + (data.mock ? 'Імітація успішна (введіть SMTP)' : 'Запрошення надіслано!');
				this.btnSubmit.classList.add("btn-success");
				this.btnSubmit.style.backgroundColor = "var(--color-success)";
				this.btnSubmit.style.borderColor = "var(--color-success)";
				this.btnSubmit.style.color = "#fff";
				
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
