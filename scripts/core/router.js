// ./scripts/core/router.js

import { getProfileUrl, resolveRealId } from "../utils/personUtils.js";
import { buildPersonObject } from "../services/processor.js";
import { renderProfile } from "../components/ui/profile/index.js";
import { buildGenerationHTML } from "../components/ui/tree/treeBuilder.js";
import { buildMobileGenerationHTML } from "../components/ui/tree/mobileTreeBuilder.js";
import { renderErrorState } from "../components/ui/shared/errorState.js";
import { MobileSwipeManager } from "../components/interaction/mobileSwipeManager.js"; // Підключення автономного менеджера свайпів

export class AppRouter {
	constructor(appInstance) {
		this.app = appInstance;

		this.handlePopState = this.handlePopState.bind(this);
		this.navigateToId = this.navigateToId.bind(this);
		this._handleDocumentClick = this._handleDocumentClick.bind(this);
		this._handleMediaQueryChange = this._handleMediaQueryChange.bind(this);

		this._mediaQueryList = window.matchMedia("(max-width: 767px)");

		window.addEventListener("popstate", this.handlePopState);
		document.body.addEventListener("click", this._handleDocumentClick);
		this._mediaQueryList.addEventListener(
			"change",
			this._handleMediaQueryChange,
		);

		// Ініціалізація кінематики з делегуванням логіки перемикання
		this.swipeManager = new MobileSwipeManager({
			onSwipeLeft: () => this._navigateSibling(1),
			onSwipeRight: () => this._navigateSibling(-1),
			threshold: 40,
			timeout: 600,
		});
	}

	destroy() {
		window.removeEventListener("popstate", this.handlePopState);
		document.body.removeEventListener("click", this._handleDocumentClick);
		this._mediaQueryList.removeEventListener(
			"change",
			this._handleMediaQueryChange,
		);

		if (this.swipeManager) {
			this.swipeManager.destroy();
		}
	}

	_navigateSibling(direction) {
		const managers = this.app.managers;
		if (
			!managers.lineage ||
			typeof managers.lineage.logic?.buildPath !== "function"
		)
			return;

		const path = managers.lineage.logic.buildPath(this.app.currentProfileId);
		if (!path || path.length === 0) return;

		const currentItem = path[path.length - 1];
		if (
			!currentItem ||
			!currentItem.siblings ||
			currentItem.siblings.length <= 1
		)
			return;

		const currentIndex = currentItem.siblings.findIndex(
			(s) =>
				String(s.id) === String(currentItem.id) ||
				String(s.id) === String(this.app.currentProfileId),
		);

		if (currentIndex === -1) return;

		let targetIndex = currentIndex + direction;

		// Топологічне замикання графа (Loop)
		if (targetIndex >= currentItem.siblings.length) targetIndex = 0;
		if (targetIndex < 0) targetIndex = currentItem.siblings.length - 1;

		const targetSibling = currentItem.siblings[targetIndex];

		if (targetSibling && targetSibling.id) {
			const viewContainer = document.querySelector(
				"#tree-view:not(.hidden), #profile-content:not(.hidden)",
			);

			if (viewContainer) {
				const translateX = direction > 0 ? "-30px" : "30px";
				viewContainer.style.transition =
					"transform 0.15s ease-out, opacity 0.15s ease-out";
				viewContainer.style.transform = `translateX(${translateX})`;
				viewContainer.style.opacity = "0.3";

				setTimeout(() => {
					this.navigateToId(targetSibling.id, false);
					viewContainer.style.transform = "";
					viewContainer.style.opacity = "1";
				}, 150);
			} else {
				this.navigateToId(targetSibling.id, false);
			}
		}
	}

	_handleDocumentClick(e) {
		const stopPropEl = e.target.closest(".js-stop-prop, .js-stop-propagation");

		const internalAnchor = e.target.closest("a[href^='?id=']");
		if (internalAnchor) {
			if (stopPropEl) {
				e.stopImmediatePropagation();
			}
			e.preventDefault();
			const url = new URL(internalAnchor.href, window.location.origin);
			const targetId = url.searchParams.get("id");
			const viewMode = url.searchParams.get("view") || "profile";

			if (targetId) {
				this.navigateToId(targetId, false, viewMode);
			}
			return;
		}

		if (stopPropEl) {
			e.stopImmediatePropagation();
			return;
		}

		const profileLink = e.target.closest(".js-profile-link");
		if (profileLink) {
			e.preventDefault();
			const targetId =
				profileLink.getAttribute("data-id") ||
				profileLink.getAttribute("data-profile-id");
			if (targetId) {
				const currentUrl = new URL(window.location);
				const viewMode = currentUrl.searchParams.get("view") || "tree";
				this.navigateToId(targetId, false, viewMode);
			}
			return;
		}

		const profileBtn = e.target.closest(".btn-goto-profile");
		if (
			profileBtn &&
			document.getElementById("tree-root")?.contains(profileBtn)
		) {
			e.stopImmediatePropagation();
			const targetId = profileBtn.getAttribute("data-profile-id");
			if (targetId) {
				this.navigateToId(targetId, false, "profile");
			}
			return;
		}

		const treeCard = e.target.closest(".tree-node, .kinship-card");
		if (
			treeCard &&
			(document.getElementById("tree-root")?.contains(treeCard) ||
				treeCard.closest(".tree-mobile-container")) &&
			!treeCard.classList.contains("tree-node--unknown")
		) {
			e.stopImmediatePropagation(); // Запобігаємо спливанню події до попапу
			e.preventDefault();

			const personId = treeCard.getAttribute("data-id");
			const currentUrl = new URL(window.location);
			const currentId = currentUrl.searchParams.get("id");

			const resolvedCurrentId = resolveRealId(currentId, this.app.engine);
			const resolvedTargetId = resolveRealId(personId, this.app.engine);

			if (resolvedTargetId && resolvedTargetId !== resolvedCurrentId) {
				this.navigateToId(personId, false, "tree");
			}
			return;
		}

		const returnBtn = e.target.closest('[data-action="return-home"]');
		if (returnBtn && this.app.rootPersonId) {
			e.preventDefault();
			this.navigateToId(this.app.rootPersonId, true);
		}
	}

	_handleMediaQueryChange() {
		const currentUrl = new URL(window.location);
		if (currentUrl.searchParams.get("view") !== "profile") {
			this.handlePopState();
		}
	}

	navigateToId(id, replaceHistory = false, viewMode = null) {
		if (!id) return;

		const url = new URL(window.location);
		url.searchParams.set("id", id);

		url.searchParams.delete("mode");
		url.searchParams.delete("target_id");
		url.searchParams.delete("rel_p1");
		url.searchParams.delete("rel_p2");
		url.searchParams.delete("rel_idx");

		if (viewMode) {
			url.searchParams.set("view", viewMode);
		} else if (!url.searchParams.has("view")) {
			url.searchParams.set("view", "tree");
		}

		if (replaceHistory) {
			window.history.replaceState({ id }, "", url);
		} else {
			window.history.pushState({ id }, "", url);
		}

		this.handlePopState();
	}

	_normalizeUrlParams(currentUrl, rootId) {
		let id = currentUrl.searchParams.get("id");
		let viewParam = currentUrl.searchParams.get("view");
		let needsUpdate = false;

		if (!id) {
			const defaultUrl = new URL(
				window.location.origin +
					window.location.pathname +
					getProfileUrl(rootId, this.app.engine),
			);
			id = defaultUrl.searchParams.get("id") || rootId;
			currentUrl.searchParams.set("id", id);
			needsUpdate = true;
		}

		if (!viewParam) {
			currentUrl.searchParams.set("view", "tree");
			needsUpdate = true;
		}

		if (needsUpdate) {
			window.history.replaceState({ id }, "", currentUrl);
		}

		return id;
	}

	_checkAccessRules(id, rootId, personData) {
		if (String(id) === String(rootId)) return null;

		const statusStr = String(personData.status || "")
			.toLowerCase()
			.trim();
		const strId = String(id).toLowerCase().trim();

		if (personData._isMissing && !strId.startsWith("v_")) return "not_found";
		if (strId.startsWith("f")) return "not_found";
		if (statusStr.includes("isolated") || statusStr.includes("ізольован"))
			return "isolated";
		if (statusStr.includes("indirect") || statusStr.includes("непрям"))
			return "indirect";
		if (statusStr.includes("acquaintance") || statusStr.includes("знайом"))
			return "acquaintance";

		return null;
	}

	_setUIVisibility(mode) {
		const treeViewEl = document.getElementById("tree-view");
		const profileContentEl = document.getElementById("profile-content");

		if (mode === "error") {
			document.body.classList.add("error-state-active");
			if (treeViewEl) treeViewEl.classList.add("hidden");
			if (profileContentEl) profileContentEl.classList.remove("hidden");
		} else if (mode === "tree") {
			document.body.classList.remove("error-state-active");
			if (profileContentEl) profileContentEl.classList.add("hidden");
			if (treeViewEl) {
				treeViewEl.style.opacity = "0";
				treeViewEl.style.transition = "opacity 0.2s ease";
				treeViewEl.classList.remove("hidden");
			}
		} else if (mode === "profile") {
			document.body.classList.remove("error-state-active");
			if (treeViewEl) {
				treeViewEl.classList.add("hidden");
				treeViewEl.style.opacity = "1";
				treeViewEl.style.transition = "";
			}
			if (profileContentEl) profileContentEl.classList.remove("hidden");
		}
	}

	_renderError() {
		this._setUIVisibility("error");
		const profileContentEl = document.getElementById("profile-content");
		if (profileContentEl) {
			profileContentEl.innerHTML = renderErrorState();
		}
		this.app.managers.relationship?.restoreUI(false);
	}

	_renderTree(id, engine) {
		this._setUIVisibility("tree");
		const treeRootEl = document.getElementById("tree-root");
		const treeViewEl = document.getElementById("tree-view");

		if (treeRootEl) {
			treeRootEl.innerHTML = "";

			const filterIds =
				this.app.managers.lineage?.logic?.mode !== "all"
					? this.app.managers.lineage?.logic?.queue
					: null;
			const isMobile = this._mediaQueryList.matches;

			if (isMobile) {
				treeRootEl.className = "genealogy-tree-mobile-wrapper";
				treeRootEl.innerHTML = buildMobileGenerationHTML(
					id,
					engine,
					5,
					filterIds,
				);
			} else {
				treeRootEl.className = "genealogy-tree";
				const rootUl = document.createElement("ul");
				rootUl.innerHTML = buildGenerationHTML(id, engine, 5, filterIds);
				treeRootEl.appendChild(rootUl);
			}

			if (window.zoomManager) {
				void treeRootEl.offsetHeight;
				window.zoomManager.reset();
				requestAnimationFrame(() => {
					if (treeViewEl) treeViewEl.style.opacity = "1";
				});
			} else {
				if (treeViewEl) treeViewEl.style.opacity = "1";
			}
		}
	}

	_renderProfile(personData) {
		this._setUIVisibility("profile");
		renderProfile(personData);
	}

	handlePopState() {
		const currentUrl = new URL(window.location);
		const mode = currentUrl.searchParams.get("mode");
		const viewParam = currentUrl.searchParams.get("view");
		const rootId = this.app.rootPersonId;
		const managers = this.app.managers;
		const engine = this.app.engine;

		const rawId = this._normalizeUrlParams(currentUrl, rootId);
		const id = resolveRealId(rawId, engine) || rawId;

		const lineMode = currentUrl.searchParams.get("line") || "all";
		if (managers.lineage && managers.lineage.mode !== lineMode) {
			managers.lineage.setMode(lineMode, false);
			return;
		}

		this.app.currentProfileId = id;
		const personData = buildPersonObject(id, engine);

		const accessDeniedReason = this._checkAccessRules(id, rootId, personData);
		if (accessDeniedReason) {
			this._renderError();
			return;
		}

		if (managers.lineage && managers.lineage.mode !== "all") {
			const allowedIds = managers.lineage.queue;
			if (!allowedIds.includes(String(id)) && String(id) !== String(rootId)) {
				this.navigateToId(rootId, true);
				return;
			}
		}

		if (mode === "relationship") {
			const targetId = currentUrl.searchParams.get("target_id");
			const relIdx = parseInt(currentUrl.searchParams.get("rel_idx"), 10) || 0;

			if (targetId) {
				managers.relationship?.showComparison(id, targetId, null, relIdx);
			} else {
				this.navigateToId(id, true);
			}
			return;
		}

		managers.relationship?.restoreUI(false);

		if (viewParam !== "profile") {
			this._renderTree(id, engine);
		} else {
			this._renderProfile(personData);
		}

		managers.navigation?.start(id);

		if (typeof managers.lineage?.logic?.buildPath === "function") {
			const path = managers.lineage.logic.buildPath(id);
			managers.breadcrumbs?.renderPath(path);
		}
	}
}
