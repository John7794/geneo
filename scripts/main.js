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
import { AnalyticsManager } from "./components/interaction/analyticsManager.js";
import { FanChartManager } from "./components/circle/fanChartManager.js";
import { ThemeManager } from "./components/interaction/themeManager.js";
import { MobileMenuManager } from "./components/interaction/mobileMenuManager.js";
import { ShareManager } from "./components/interaction/shareManager.js";
import { UpdateManager } from "./components/interaction/updateManager.js";
import { GlobalModalInterceptor } from "./core/globalModalInterceptor.js";
import { AIManager } from "./components/interaction/aiManager.js";
import { GedcomManager } from "./components/interaction/gedcomManager.js";

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
			if (i18n.init) await i18n.init();
			
			let userConfig = { rootPerson: APP_CONFIG.rootId || "1", hiddenProfiles: [], canShare: false, canSync: false, isMainAdmin: false };
			try {
				const configRes = await fetch('/api/config', { headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('auth_token') || '') } });
				if (configRes.ok) {
					const configData = await configRes.json();
					if (configData.rootPerson) {
						this.rootPersonId = configData.rootPerson;
						userConfig.rootPerson = configData.rootPerson;
					}
					if (configData.hiddenProfiles) {
						userConfig.hiddenProfiles = configData.hiddenProfiles;
					}
					userConfig.canShare = configData.canShare || configData.isMainAdmin || false;
					userConfig.canSync = configData.canSync || configData.isMainAdmin || false;
					userConfig.isMainAdmin = configData.isMainAdmin || false;
					window.userConfig = userConfig;

					const btnShare = document.getElementById("btn-share");
					if (btnShare) {
						btnShare.style.display = (userConfig.isMainAdmin || userConfig.canShare) ? "" : "none";
					}
				}
			} catch(e) {
				console.warn("⚠️ Could not fetch user config, using defaults", e);
			}

			this.engine = await fetchAllData(userConfig);

			if (!this.engine) throw new Error("Engine is null");

			this._initManagers();
			this.router.handlePopState();
		} catch (error) {
			console.error("❌ Фатальний збій:", error);
			const container =
				document.getElementById("profile-content") || document.body;
			container.innerHTML = `<div style="color:red; padding:2rem; z-index:9999; position:relative;">Помилка: ${error.message}</div>`;
		} finally {
			if (loader) {
				loader.classList.add("hidden");
				// Do not remove it from DOM, so we can reuse it later
			}
		}
	}

	_initManagers() {
		this.managers.modalInterceptor = new GlobalModalInterceptor();
		this.managers.modalInterceptor.init();

		this.managers.gallery = new GalleryManager();
		this.managers.breadcrumbs = new BreadcrumbManager({
			onNavigate: this.navigateToId,
		});
		this.managers.navigation = new NavigationManager([], this.navigateToId);

		this.managers.lineage = new LineageManager(this.engine, this.rootPersonId, {
			onModeChange: (newQueue) => {
				this.managers.navigation.updateList(newQueue);
				if (this.managers.fanChart) {
					this.managers.fanChart.setLineageMode(this.managers.lineage.mode);
				}
				setTimeout(() => this.router.handlePopState(), 0);
			},
			onRefreshEvents: () => {
				if (this.managers.events) this.managers.events.refresh();
			},
		});

		this.managers.navigation.updateList(this.managers.lineage.queue);

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
		this.managers.analytics = new AnalyticsManager(this.engine);
		this.managers.fanChart = new FanChartManager(this.engine, {
			onNavigateToProfile: (id) => this.navigateToId(id, false, "profile"),
			onCenterOnPerson: (id) => this.navigateToId(id, false, window.matchMedia("(max-width: 768px)").matches ? "tree" : "circle"),
		});

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
		this.managers.share = new ShareManager(this);
		this.managers.ai = new AIManager();
		this.managers.gedcom = new GedcomManager(this.engine);

		// 🔥 Виправлення ініціалізації мобільного меню
		this.managers.mobileMenu = new MobileMenuManager();
		this.managers.update = new UpdateManager(this);

		const btnHome = document.getElementById("btn-home");
		if (btnHome) {
			btnHome.addEventListener("click", this._handleHomeClick);
		}

		const btnViewToggle = document.getElementById("btn-view-toggle");
		if (btnViewToggle) {
			btnViewToggle.addEventListener("click", (e) => {
				e.preventDefault();
				if (window.matchMedia("(max-width: 768px)").matches) return;
				const url = new URL(window.location);
				const currentView = url.searchParams.get("view");
				const targetView = currentView === "circle" || currentView === "fan" ? "tree" : "circle";
				this.navigateToId(this.currentProfileId || this.rootPersonId, false, targetView);
			});
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

