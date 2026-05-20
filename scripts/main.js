// ./scripts/main.js

import { i18n } from "./core/i18n.js";
import { APP_CONFIG } from "./core/appConfig.js";
import { fetchAllData } from "./api/api.js";
import { findPersonDetails } from "./utils/personUtils.js";
import { AppRouter } from "./core/router.js";

import { GalleryManager } from "./components/interaction/galleryManager.js";
import { SearchManager } from "./components/interaction/searchManager.js";
import { EventsManager } from "./components/interaction/eventsManager.js";
import { OnboardingController } from "./components/onboarding/OnboardingController.js";
import { PersonPopupManager } from "./components/interaction/personPopupManager.js";
import { NavigationManager } from "./components/interaction/navigationManager.js";
import { BreadcrumbManager } from "./components/interaction/breadcrumbManager.js";
import { RelationshipManager } from "./components/interaction/relationshipManager.js";
import { LineageManager } from "./components/interaction/lineageManager.js";
import { ZoomManager } from "./components/interaction/zoomManager.js";
import { enableDragScroll } from "./components/interaction/dragScrollManager.js";
import { LangManager } from "./components/interaction/langManager.js";
import { ThemeManager } from "./components/interaction/themeManager.js";
import { MobileMenuManager } from "./components/interaction/mobileMenuManager.js";
import { ShareManager } from "./components/interaction/shareManager.js";
import { GlobalModalInterceptor } from "./core/globalModalInterceptor.js";

class App {
	constructor() {
		this.engine = null;
		this.managers = {};
		this.rootPersonId = APP_CONFIG.rootId || "1";
		this.currentProfileId = null;

		this.router = new AppRouter(this);

		this.navigateToId = this.router.navigateToId.bind(this.router);
		this.handlePopState = this.router.handlePopState.bind(this.router);

		// Фіксація контексту для делегування
		this._handleGlobalPopupClick = this._handleGlobalPopupClick.bind(this);
		this._handleHomeClick = this._handleHomeClick.bind(this);
	}

	async init() {
		const loader = document.getElementById("app-loader");
		try {
			console.log("🔴 ТЕЛЕМЕТРІЯ: Запуск ініціалізації");

			if (i18n.init) await i18n.init();
			
			let userConfig = { rootPerson: APP_CONFIG.rootId || "1", hiddenProfiles: [] };
			try {
				const configRes = await fetch('/api/config');
				if (configRes.ok) {
					const configData = await configRes.json();
					if (configData.rootPerson) {
						this.rootPersonId = configData.rootPerson;
						userConfig.rootPerson = configData.rootPerson;
					}
					if (configData.hiddenProfiles) {
						userConfig.hiddenProfiles = configData.hiddenProfiles;
					}
					window.userConfig = userConfig;
				}
			} catch(e) {
				console.warn("⚠️ Could not fetch user config, using defaults", e);
			}

			console.log("🔴 ТЕЛЕМЕТРІЯ: Старт fetchAllData()");
			this.engine = await fetchAllData(userConfig);
			console.log("🟢 ТЕЛЕМЕТРІЯ: fetchAllData() завершено. Engine отримано.");

			if (!this.engine) throw new Error("Engine is null");

			console.log("🔴 ТЕЛЕМЕТРІЯ: Старт _initManagers()");
			this._initManagers();
			console.log("🟢 ТЕЛЕМЕТРІЯ: _initManagers() завершено.");

			console.log("🔴 ТЕЛЕМЕТРІЯ: Старт router.handlePopState()");
			this.router.handlePopState();
			console.log(
				"🟢 ТЕЛЕМЕТРІЯ: router.handlePopState() завершено. Рендеринг успішний.",
			);
		} catch (error) {
			console.error("❌ Фатальний збій:", error);
			const container =
				document.getElementById("profile-content") || document.body;
			container.innerHTML = `<div style="color:red; padding:2rem; z-index:9999; position:relative;">Помилка: ${error.message}</div>`;
		} finally {
			if (loader) {
				loader.classList.add("hidden");
				setTimeout(() => loader.remove(), 500);
			}
		}
	}

	_initManagers() {
		console.log("   ➤ Ініціалізація базових менеджерів...");

		this.managers.modalInterceptor = new GlobalModalInterceptor();
		this.managers.modalInterceptor.init();

		this.managers.gallery = new GalleryManager();
		this.managers.breadcrumbs = new BreadcrumbManager({
			onNavigate: this.navigateToId,
		});
		this.managers.navigation = new NavigationManager([], this.navigateToId);

		console.log("   ➤ Ініціалізація LineageManager...");
		this.managers.lineage = new LineageManager(this.engine, this.rootPersonId, {
			onModeChange: (newQueue) => {
				this.managers.navigation.updateList(newQueue);
				setTimeout(() => this.router.handlePopState(), 0);
			},
			onRefreshEvents: () => {
				if (this.managers.events) this.managers.events.refresh();
			},
		});

		this.managers.navigation.updateList(this.managers.lineage.queue);

		console.log("   ➤ Ініціалізація Search/Events...");
		this.managers.search = new SearchManager(
			this.engine,
			this.navigateToId,
			() => this.managers.lineage,
		);
		this.managers.events = new EventsManager(
			this.engine,
			this.navigateToId,
			() => this.managers.lineage,
		);

		console.log("   ➤ Ініціалізація RelationshipManager...");
		this.managers.relationship = new RelationshipManager(
			this.engine,
			this.rootPersonId,
			{
				onNavigate: this.navigateToId,
				onBreadcrumbsUpdate: (branches, idx, onSwitch) => {
					this.managers.breadcrumbs.renderRelationshipTabs(
						branches,
						idx,
						onSwitch,
					);
				},
			},
		);

		console.log("   ➤ Ініціалізація PersonPopupManager...");
		this.managers.personPopup = new PersonPopupManager(
			{
				onNavigateToProfile: this.navigateToId,
				onRelationshipRequest: (targetId, idx) => {
					this.managers.relationship.showComparison(
						this.currentProfileId,
						targetId,
						null,
						idx,
					);
				},
			},
			this.managers.relationship,
		);

		// Прикріплення іменованого обробника (усунено витік)
		document.body.addEventListener("click", this._handleGlobalPopupClick);

		this.managers.onboarding = new OnboardingController();
		this.managers.zoom = new ZoomManager();
		window.zoomManager = this.managers.zoom;
		this.managers.lang = new LangManager();
		this.managers.theme = new ThemeManager();
		this.managers.share = new ShareManager();

		// 🔥 Виправлення ініціалізації мобільного меню
		this.managers.mobileMenu = new MobileMenuManager();

		const btnHome = document.getElementById("btn-home");
		if (btnHome) {
			btnHome.addEventListener("click", this._handleHomeClick);
		}

		const btnUpdate = document.getElementById("btn-update-data");
		if (btnUpdate) {
			this._handleUpdateDataClick = this._handleUpdateDataClick.bind(this);
			btnUpdate.addEventListener("click", this._handleUpdateDataClick);
		}

		setTimeout(() => {
			const scrollableContainer =
				document.querySelector(".tree-container") ||
				document.getElementById("tree-view");
			if (scrollableContainer) enableDragScroll(scrollableContainer);
		}, 100);
	}

	_handleGlobalPopupClick(e) {
		const popupTrigger = e.target.closest(".js-open-person-popup");
		if (popupTrigger) {
			const targetId = popupTrigger.getAttribute("data-id");
			if (targetId && this.managers.personPopup) {
				const personData = findPersonDetails(targetId, this.engine);
				this.managers.personPopup.open(personData);
			}
		}
	}

	_handleHomeClick(e) {
		e.preventDefault();
		if (String(this.currentProfileId) !== String(this.rootPersonId)) {
			this.navigateToId(this.rootPersonId);
		}
	}

	async _handleUpdateDataClick(e) {
		e.preventDefault();
		const loader = document.getElementById("app-loader");
		if (loader) {
			loader.classList.remove("hidden");
			loader.querySelector(".loader__text").textContent = "Оновлення даних (може тривати кілька хвилин)...";
		}
		
		try {
			// Виклик API ендпоінта, який запустить node scripts/build/sync-data.js
			const response = await fetch('/api/sync-data', { method: 'POST' });
			const result = await response.json();
			
			if (!response.ok) {
				throw new Error(result.error || "Помилка сервера");
			}

			if (typeof localforage !== "undefined") {
				await localforage.clear();
			}
			
			// Оновити версію після синхронізації
			const cacheBust = Date.now();
			const metaResponse = await fetch(`./data/db/metadata.json?t=${cacheBust}`);
			if (metaResponse.ok) {
				const meta = await metaResponse.json();
				if (typeof localforage !== "undefined") {
					await localforage.setItem("DB_VERSION", meta.timestamp || cacheBust);
				}
			}
			window.location.reload();
		} catch (error) {
			console.error("Помилка під час оновлення даних", error);
			if (loader) loader.classList.add("hidden");
			alert("Помилка оновлення даних: " + error.message);
		}
	}
}

document.addEventListener("DOMContentLoaded", () => {
	const app = new App();
	window.app = app;
	app.init();

	if ("serviceWorker" in navigator) {
		navigator.serviceWorker.getRegistrations().then(function (registrations) {
			for (let registration of registrations) registration.unregister();
		});
	}
});
