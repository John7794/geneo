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
import { WorkspaceManager } from "./services/workspaceManager.js";
import { WorkspaceModalManager } from "./components/interaction/workspaceModalManager.js";
import { AuthManager } from "./services/authManager.js";
import { AccountModalManager } from "./components/interaction/accountModalManager.js";
import { WelcomeModalManager } from "./components/interaction/welcomeModalManager.js";
import { GoogleDriveService } from "./services/googleDriveService.js";
import { GoogleDriveModalManager } from "./components/interaction/googleDriveModalManager.js";

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

			this.authManager = new AuthManager();
			const currentUser = await this.authManager.init();

			// AUTH GATE: неавторизовані користувачі перенаправляються на /login
			const isGuestMode = new URLSearchParams(window.location.search).get("guest") === "true";
			if (!this.authManager.isAuthenticated && !isGuestMode) {
				window.location.href = "/login";
				return;
			}
			
			let userConfig = { 
				rootPerson: APP_CONFIG.rootId || "1", 
				hiddenProfiles: [], 
				canShare: false, 
				canSync: false, 
				email: currentUser?.email || "",
				isAuthorOwner: (currentUser?.email || "").toLowerCase().trim() === "ivanselivanov771994@gmail.com",
				isMainAdmin: this.authManager.isAdmin() 
			};

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
					userConfig.email = currentUser?.email || "";
					userConfig.canShare = configData.canShare || false;
					userConfig.canSync = configData.canSync || false;
					userConfig.isMainAdmin = !!(configData.isMainAdmin || this.authManager.isAdmin());
					userConfig.isAuthorOwner = !!configData.isAuthorOwner || (currentUser?.email?.toLowerCase() === "ivanselivanov771994@gmail.com");
					userConfig.hasAuthorTreeAccess = configData.hasAuthorTreeAccess !== false;
					window.userConfig = userConfig;

					const btnShare = document.getElementById("btn-share");
					if (btnShare) {
						btnShare.style.display = userConfig.canShare ? "" : "none";
					}
				}
			} catch(e) {
				console.warn("⚠️ Could not fetch user config, using defaults", e);
			}

			this.workspaceManager = new WorkspaceManager();
			const activeWs = await this.workspaceManager.init(userConfig);

			// Якщо у користувача немає жодного підключеного дерева — відкриваємо Онбординг
			const userWorkspaces = this.workspaceManager.getWorkspaces();
			if (!activeWs || userWorkspaces.length === 0) {
				this._initBasicManagers();
				if (this.welcomeModalManager) {
					this.welcomeModalManager.open();
				}
				const loader = document.getElementById("app-loader");
				if (loader) loader.classList.add("hidden");
				return;
			}

			if (activeWs && activeWs.probandId) {
				this.rootPersonId = activeWs.probandId;
				userConfig.rootPerson = activeWs.probandId;
			}

			this.engine = await this.workspaceManager.loadActiveEngine(userConfig);
			if (this.engine) {
				this.workspaceManager.setEngine(this.engine);
			}

			if (!this.engine) {
				this._initBasicManagers();
				this._renderAccessDeniedView();
				return;
			}

			// Контроль прав шерингу: ТІЛЬКИ власник має право ділитися деревом!
			const btnShare = document.getElementById("btn-share");
			if (btnShare) {
				btnShare.style.display = this.workspaceManager.canShareCurrentWorkspace() ? "" : "none";
			}

			this._initManagers();
			this.router.handlePopState();

			// Періодична фонова перевірка актуальності прав доступу
			const checkLiveAccess = async () => {
				try {
					const res = await fetch("/api/config", {
						headers: { Authorization: "Bearer " + (localStorage.getItem("auth_token") || "") },
					});
					if (res.ok) {
						const cfg = await res.json();
						const curWs = this.workspaceManager?.getActiveWorkspace();
						if (curWs?.id === "bundled_author" && cfg.hasAuthorTreeAccess === false) {
							if (typeof localforage !== "undefined") {
								const keys = await localforage.keys();
								for (const k of keys) {
									if (k.includes("/data/db/") || k.startsWith("kinship_index_") || k === "store_version") {
										await localforage.removeItem(k);
									}
								}
							}
							// Повне видалення дерева зі списку доступних дерев гостя
							if (this.workspaceManager) {
								this.workspaceManager.workspaces = this.workspaceManager.workspaces.filter(w => w.id !== "bundled_author");
								this.workspaceManager._persistMeta();
								localStorage.removeItem("geneo_active_ws_id");
							}
							window.location.reload();
						}
					}
				} catch (e) {}
			};

			window.addEventListener("focus", checkLiveAccess);
			setInterval(checkLiveAccess, 45000);
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
			getRootId: () => this.rootPersonId,
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
		this.driveService = new GoogleDriveService();
		this.managers.googleDrive = new GoogleDriveModalManager(this.driveService, this.workspaceManager, this.authManager);

		this.managers.gedcom = new GedcomManager(this.engine, this.workspaceManager, this.driveService);
		this.managers.workspaces = new WorkspaceModalManager(this.workspaceManager, this.managers.gedcom);
		this.managers.account = new AccountModalManager(
			this.authManager,
			this.workspaceManager,
			this.managers.gedcom,
			this.driveService,
			this.managers.googleDrive,
			() => this.engine,
			(personId) => {
				this.managers.account?.close();
				if (this.managers.personPopup && this.engine) {
					const personData = findPersonDetails(personId, this.engine);
					if (personData) this.managers.personPopup.open(personData);
				}
				this.navigateToId(personId);
			}
		);
		this.managers.welcome = new WelcomeModalManager(this.managers.gedcom, this.managers.account);
		this.managers.welcome.checkFirstRun();

		// Підключення додаткових кнопок виклику кабінету
		document.querySelectorAll(".js-open-account").forEach((el) => {
			el.addEventListener("click", () => this.managers.account.open());
		});

		// Делегування кнопки перевірки дерева
		document.addEventListener("click", (e) => {
			if (e.target.closest(".js-open-audit")) {
				e.preventDefault();
				if (this.managers.account) {
					this.managers.account.switchTab("audit");
					this.managers.account.open();
				}
			}
		});

		// Делегування кнопки поділитися до вкладки шерингу в кабінеті
		document.addEventListener("click", (e) => {
			if (e.target.closest(".js-open-share")) {
				e.preventDefault();
				if (this.managers.account) {
					this.managers.account.open();
					this.managers.account.switchTab("sharing");
				}
			}
		});

		// Фонове оновлення бейджа аудиту родоводу у вільний час процесора (Idle Callback)
		if (typeof window !== "undefined" && "requestIdleCallback" in window) {
			window.requestIdleCallback(() => {
				this.managers.account?.updateAuditBadge();
			}, { timeout: 4000 });
		} else {
			setTimeout(() => {
				this.managers.account?.updateAuditBadge();
			}, 3000);
		}

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

	_initBasicManagers() {
		this.managers.modalInterceptor = new GlobalModalInterceptor();
		this.managers.modalInterceptor.init();

		this.managers.gedcom = new GedcomManager(null, this.workspaceManager, this.driveService);
		this.managers.workspaces = new WorkspaceModalManager(this.workspaceManager, this.managers.gedcom);
		this.managers.account = new AccountModalManager(
			this.authManager,
			this.workspaceManager,
			this.managers.gedcom,
			this.driveService,
			null,
			() => null,
			(id) => this.navigateToId(id),
		);
	}

	_renderAccessDeniedView() {
		const loader = document.getElementById("app-loader");
		if (loader) loader.classList.add("hidden");

		const navDock = document.getElementById("mobile-menu-btn");
		if (navDock) navDock.style.display = "none";
		const searchBtn = document.getElementById("btn-search");
		if (searchBtn) searchBtn.style.display = "none";
		const lineageBtn = document.getElementById("btn-lineage-toggle");
		if (lineageBtn) lineageBtn.style.display = "none";
		const shareBtn = document.getElementById("btn-share");
		if (shareBtn) shareBtn.style.display = "none";

		const container = document.getElementById("profile-content") || document.body;
		container.innerHTML = `
			<div class="access-denied-screen" style="display:flex; justify-content:center; align-items:center; min-height:80vh; padding:20px; box-sizing:border-box;">
				<div class="account-sharing-restricted" style="max-width:500px; width:100%; background:var(--color-bg-card); border:1px solid var(--color-border); border-radius:16px; padding:2.25rem 1.5rem; box-shadow:0 10px 25px -5px rgba(0,0,0,0.1); text-align:center;">
					<div class="restricted-icon" style="font-size:48px; color:#ef4444; margin-bottom:12px;"><i class="ri-shield-keyhole-line"></i></div>
					<h3 style="margin:0 0 8px 0; font-size:1.35rem; color:var(--color-text-main);">Доступ до дерева відкликано</h3>
					<p class="restricted-desc" style="color:var(--color-text-muted); font-size:0.95rem; line-height:1.45; margin:0 0 1.25rem 0;">
						Власник дерева відкликав дозвіл на перегляд родоводу <strong>«Родовід Селіванових»</strong> для вашого облікового запису.
					</p>
					<div class="restricted-notice" style="margin-bottom:1.5rem;">
						<i class="ri-information-line"></i>
						<span>Якщо ви вважаєте, що це помилка, зверніться до власника дерева для поновлення доступу, або завантажте власне родинне дерево.</span>
					</div>
					<div class="restricted-action" style="display:flex; flex-direction:column; gap:10px;">
						<button id="btn-denied-import-tree" class="btn btn-primary" style="height:44px; min-height:44px; justify-content:center; border-radius:10px; font-weight:600;">
							<i class="ri-file-upload-line"></i> Додати своє дерево (GEDCOM)
						</button>
						<button id="btn-denied-logout" class="btn btn-secondary" style="height:44px; min-height:44px; justify-content:center; border-radius:10px;">
							<i class="ri-logout-box-r-line"></i> Вийти з акаунту
						</button>
					</div>
				</div>
			</div>
		`;

		const btnImport = document.getElementById("btn-denied-import-tree");
		if (btnImport) {
			btnImport.onclick = () => {
				const gedcomOverlay = document.getElementById("gedcom-overlay");
				if (gedcomOverlay) {
					gedcomOverlay.classList.remove("hidden");
					gedcomOverlay.classList.add("show");
				}
			};
		}

		const btnLogout = document.getElementById("btn-denied-logout");
		if (btnLogout) {
			btnLogout.onclick = () => {
				this.authManager.logout();
			};
		}
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

