// ./scripts/services/authManager.js

/**
 * Керування автентифікацією користувача, сесіями та правами доступу
 */
export class AuthManager {
	constructor() {
		this.user = null;
		this.isAuthenticated = false;
		this.listeners = [];
		this._storageKeyToken = "auth_token";
		this._storageKeyUser = "geneo_user";
	}

	/**
	 * Ініціалізація та перевірка поточної сесії
	 */
	async init() {
		// 1. Спочатку читаємо кешований профіль для миттєвого рендерингу інтерфейсу
		try {
			const cached = localStorage.getItem(this._storageKeyUser);
			if (cached) {
				this.user = JSON.parse(cached);
				this.isAuthenticated = true;
			}
		} catch (e) {
			console.warn("Помилка читання кешу користувача:", e);
		}

		// 2. Валідація сесії на сервері
		const token = localStorage.getItem(this._storageKeyToken);
		try {
			const headers = {};
			if (token) headers["Authorization"] = `Bearer ${token}`;

			const res = await fetch("/api/auth-me", { headers });
			if (res.ok) {
				const data = await res.json();
				if (data.authenticated && data.user) {
					this.user = data.user;
					this.isAuthenticated = true;
					localStorage.setItem(this._storageKeyUser, JSON.stringify(this.user));
					this._notifyListeners();
					return this.user;
				}
			}
		} catch (e) {
			console.warn("⚠️ Сервер недоступний або режим офлайн. Працюємо з локальним профілем.", e);
		}

		// 3. Fallback: якщо не авторизовано і немає сервера (локальний/офлайн режим)
		if (!this.user) {
			this.user = {
				email: "local.user@geneo.app",
				displayName: "Локальний дослідник",
				role: "owner",
				isMainAdmin: false,
				canShare: false, // Локальні дерева не потребують хмарного шерингу без бекенду
				canSync: false,
				connectedDrive: null,
			};
			this.isAuthenticated = false;
		}

		this._notifyListeners();
		return this.user;
	}

	/**
	 * Вхід з email та паролем
	 */
	async login(email, password) {
		const res = await fetch("/api/auth-login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password }),
		});
		const data = await res.json();
		if (!res.ok || !data.success) {
			throw new Error(data.error || "Помилка входу");
		}

		if (data.token) localStorage.setItem(this._storageKeyToken, data.token);
		if (data.user) {
			this.user = data.user;
			this.isAuthenticated = true;
			localStorage.setItem(this._storageKeyUser, JSON.stringify(this.user));
		}
		this._notifyListeners();
		return this.user;
	}

	/**
	 * Реєстрація нового користувача
	 */
	async register(email, password, displayName) {
		const res = await fetch("/api/auth-register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password, displayName }),
		});
		const data = await res.json();
		if (!res.ok || !data.success) {
			throw new Error(data.error || "Помилка реєстрації");
		}

		if (data.token) localStorage.setItem(this._storageKeyToken, data.token);
		if (data.user) {
			this.user = data.user;
			this.isAuthenticated = true;
			localStorage.setItem(this._storageKeyUser, JSON.stringify(this.user));
		}
		this._notifyListeners();
		return this.user;
	}

	/**
	 * Вихід із системи
	 */
	async logout() {
		try {
			await fetch("/api/auth-logout", { method: "POST" });
		} catch (e) {}

		localStorage.removeItem(this._storageKeyToken);
		localStorage.removeItem(this._storageKeyUser);
		this.user = null;
		this.isAuthenticated = false;

		// Перезавантажуємо сторінку для чистого скидання стану
		window.location.href = "/login";
	}

	/**
	 * Отримати дані користувача
	 */
	getUser() {
		return this.user;
	}

	/**
	 * Чи є користувач адміністратором системи
	 */
	isAdmin() {
		return !!(this.user?.isMainAdmin || this.user?.role === "admin");
	}

	/**
	 * Отримати ініціали для аватарки
	 */
	getUserInitials() {
		if (!this.user || !this.user.displayName) return "Г";
		const parts = this.user.displayName.trim().split(/\s+/);
		if (parts.length >= 2) {
			return (parts[0][0] + parts[1][0]).toUpperCase();
		}
		return this.user.displayName.slice(0, 2).toUpperCase();
	}

	/**
	 * Підписка на оновлення стану авторизації
	 */
	onAuthChange(fn) {
		if (typeof fn === "function") this.listeners.push(fn);
	}

	_notifyListeners() {
		for (const fn of this.listeners) {
			try {
				fn(this.user, this.isAuthenticated);
			} catch (e) {
				console.error("Auth listener error:", e);
			}
		}
	}
}
