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

	_navigateSwipe(direction) {
		const managers = this.app.managers;
		const url = new URL(window.location);
		const mode = url.searchParams.get("mode");

		// 1. Comparison Mode (Показує декілька спільних гілок)
		if (mode === "relationship") {
			if (managers.relationship) {
				const container = document.querySelector("#tree-view:not(.hidden)");
				if (container) {
					const translateX = direction > 0 ? "-30px" : "30px";
					container.style.transition =
						"transform 0.15s ease-out, opacity 0.15s ease-out";
					container.style.transform = `translateX(${translateX})`;
					container.style.opacity = "0.3";

					setTimeout(() => {
						if (direction > 0)
							managers.relationship.nextScenario(this.app.currentProfileId);
						else
							managers.relationship.prevScenario(this.app.currentProfileId);

						container.style.transform = "";
						container.style.opacity = "1";
					}, 150);
				} else {
					if (direction > 0)
						managers.relationship.nextScenario(this.app.currentProfileId);
					else managers.relationship.prevScenario(this.app.currentProfileId);
				}
			}
			return;
		}

		// 2. Визначаємо активний режим: Профіль чи Дерево
		const currentView = url.searchParams.get("view");
		const profileEl = document.getElementById("profile-content");
		const isProfileMode =
			currentView === "profile" ||
			(profileEl && !profileEl.classList.contains("hidden"));

		let targetId = null;

		if (isProfileMode) {
			targetId = this._getNextProfileId(direction);
		} else {
			targetId = this._getNextTreeId(direction);
		}

		if (targetId && String(targetId) !== String(this.app.currentProfileId)) {
			const viewContainer = document.querySelector(
				"#profile-content:not(.hidden), #tree-view:not(.hidden)",
			);

			if (viewContainer) {
				const exitX = direction > 0 ? "-40px" : "40px";
				const enterX = direction > 0 ? "40px" : "-40px";

				viewContainer.style.transition =
					"transform 0.15s cubic-bezier(0.2, 0, 0, 1), opacity 0.15s ease-out";
				viewContainer.style.transform = `translateX(${exitX})`;
				viewContainer.style.opacity = "0.2";

				setTimeout(() => {
					this.navigateToId(
						targetId,
						false,
						isProfileMode ? "profile" : null,
					);

					viewContainer.style.transition = "none";
					viewContainer.style.transform = `translateX(${enterX})`;
					viewContainer.style.opacity = "0.2";

					requestAnimationFrame(() => {
						viewContainer.style.transition =
							"transform 0.2s cubic-bezier(0, 0, 0.2, 1), opacity 0.2s ease-out";
						viewContainer.style.transform = "";
						viewContainer.style.opacity = "1";

						setTimeout(() => {
							viewContainer.style.transition = "";
							viewContainer.style.transform = "";
							viewContainer.style.opacity = "";
						}, 250);
					});
				}, 150);
			} else {
				this.navigateToId(
					targetId,
					false,
					isProfileMode ? "profile" : null,
				);
			}
		}
	}

	_navigateSibling(direction) {
		return this._navigateSwipe(direction);
	}

	_getNextProfileId(direction) {
		const managers = this.app.managers;
		const currentIdStr = String(this.app.currentProfileId);

		// 1. Пріоритет: Навігаційна черга активної лінії роду (Lineage / Navigation queue)
		const navQueue =
			managers.navigation?.sortedIds &&
			managers.navigation.sortedIds.length > 0
				? managers.navigation.sortedIds
				: managers.lineage?.queue || [];

		let qIdx = navQueue.indexOf(currentIdStr);
		if (qIdx === -1 && this.app.engine) {
			const resolved = resolveRealId(currentIdStr, this.app.engine);
			if (resolved) qIdx = navQueue.indexOf(String(resolved));
		}

		if (qIdx !== -1 && navQueue.length > 1) {
			let nextIdx =
				(qIdx + direction + navQueue.length) % navQueue.length;
			return navQueue[nextIdx];
		}

		// 2. Якщо особа поза чергою (наприклад, зведений родич) — перемикаємо серед братів/сестер
		const p = buildPersonObject(this.app.currentProfileId, this.app.engine);
		if (p && p.siblings) {
			let siblingIds = [currentIdStr];
			const addIds = (arr) => {
				if (Array.isArray(arr))
					arr.forEach((s) => siblingIds.push(String(s.id)));
			};
			addIds(p.siblings.full);
			addIds(p.siblings.half_p);
			addIds(p.siblings.half_m);
			siblingIds = [...new Set(siblingIds)];

			if (siblingIds.length > 1) {
				let sIdx = siblingIds.indexOf(currentIdStr);
				if (sIdx !== -1) {
					let nextSIdx =
						(sIdx + direction + siblingIds.length) % siblingIds.length;
					return siblingIds[nextSIdx];
				}
			}
		}

		// 3. Близькі родичі (подружжя, діти, батьки)
		if (p) {
			const familyMembers = [];
			if (Array.isArray(p.spouses))
				p.spouses.forEach((s) => familyMembers.push(String(s.id)));
			if (Array.isArray(p.children))
				p.children.forEach((c) => familyMembers.push(String(c.id)));
			if (Array.isArray(p.parents))
				p.parents.forEach((par) => familyMembers.push(String(par.id)));

			const validFamily = [...new Set(familyMembers)].filter(
				(id) => id && id !== currentIdStr,
			);
			if (validFamily.length > 0) {
				let fIdx = direction > 0 ? 0 : validFamily.length - 1;
				return validFamily[fIdx];
			}
		}

		// 4. Глобальний фолбек по базі basic.csv
		if (this.app.engine?.db?.basic && this.app.engine.db.basic.length > 1) {
			const allBasic = this.app.engine.db.basic;
			const allIds = allBasic
				.map((r) => String(r.person_id || r.id || "").trim())
				.filter(Boolean);
			let bIdx = allIds.indexOf(currentIdStr);
			if (bIdx !== -1) {
				return allIds[(bIdx + direction + allIds.length) % allIds.length];
			}
		}

		return null;
	}

	_getNextTreeId(direction) {
		const managers = this.app.managers;
		const currentIdStr = String(this.app.currentProfileId);

		// У режимі дерева на мобільному свайп перемикає пробанда серед братів/сестер активної гілки
		if (
			managers.lineage &&
			typeof managers.lineage.logic?.buildPath === "function"
		) {
			const path = managers.lineage.logic.buildPath(
				this.app.currentProfileId,
			);
			if (path && path.length > 0) {
				const currentItem = path[path.length - 1];
				if (
					currentItem &&
					currentItem.siblings &&
					currentItem.siblings.length > 1
				) {
					const currentIndex = currentItem.siblings.findIndex(
						(s) =>
							String(s.id) === String(currentItem.id) ||
							String(s.id) === currentIdStr,
					);
					if (currentIndex !== -1) {
						let tIndex =
							(currentIndex + direction + currentItem.siblings.length) %
							currentItem.siblings.length;
						return currentItem.siblings[tIndex]?.id;
					}
				}
			}
		}

		const p = buildPersonObject(this.app.currentProfileId, this.app.engine);
		if (p && p.siblings) {
			let siblingIds = [currentIdStr];
			const addIds = (arr) => {
				if (Array.isArray(arr))
					arr.forEach((s) => siblingIds.push(String(s.id)));
			};
			addIds(p.siblings.full);
			addIds(p.siblings.half_p);
			addIds(p.siblings.half_m);
			siblingIds = [...new Set(siblingIds)];

			if (siblingIds.length > 1) {
				const currentIndex = siblingIds.indexOf(currentIdStr);
				if (currentIndex !== -1) {
					let tIndex =
						(currentIndex + direction + siblingIds.length) %
						siblingIds.length;
					return siblingIds[tIndex];
				}
			}
		}

		// Якщо сиблінгів немає — перемикаємо по навігаційній черзі лінії
		const navQueue =
			managers.navigation?.sortedIds || managers.lineage?.queue || [];
		if (navQueue.length > 1) {
			let qIdx = navQueue.indexOf(currentIdStr);
			if (qIdx !== -1) {
				return navQueue[(qIdx + direction + navQueue.length) % navQueue.length];
			}
		}

		return null;
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
		const currentView = url.searchParams.get("view");
		if (currentView !== "analytics") {
			url.searchParams.delete("timeline_mode");
			url.searchParams.delete("timeline_start");
			url.searchParams.delete("timeline_end");
		}
		// Видаляємо hash повністю, щоб не залишалося "#"
		const cleanUrl = url.pathname + url.search;

		if (replaceHistory) {
			window.history.replaceState({ id }, "", cleanUrl);
		} else {
			window.history.pushState({ id }, "", cleanUrl);
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
			viewParam = "tree";
			needsUpdate = true;
		}

		if (viewParam !== "analytics") {
			if (currentUrl.searchParams.has("timeline_mode")) {
				currentUrl.searchParams.delete("timeline_mode");
				needsUpdate = true;
			}
			if (currentUrl.searchParams.has("timeline_start")) {
				currentUrl.searchParams.delete("timeline_start");
				needsUpdate = true;
			}
			if (currentUrl.searchParams.has("timeline_end")) {
				currentUrl.searchParams.delete("timeline_end");
				needsUpdate = true;
			}
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
		const fanChartViewEl = document.getElementById("fan-chart-view");
		const profileContentEl = document.getElementById("profile-content");
		const analyticsViewEl = document.getElementById("analytics-view");
		if (analyticsViewEl) analyticsViewEl.classList.add("hidden");

		if (mode === "error") {
			document.body.classList.add("error-state-active");
			if (treeViewEl) treeViewEl.classList.add("hidden");
			if (fanChartViewEl) fanChartViewEl.classList.add("hidden");
			if (profileContentEl) profileContentEl.classList.remove("hidden");
		} else if (mode === "tree") {
			document.body.classList.remove("error-state-active");
			if (profileContentEl) profileContentEl.classList.add("hidden");
			if (fanChartViewEl) fanChartViewEl.classList.add("hidden");
			if (treeViewEl) {
				treeViewEl.style.opacity = "0";
				treeViewEl.style.transition = "opacity 0.2s ease";
				treeViewEl.classList.remove("hidden");
			}
		} else if (mode === "circle" || mode === "fan") {
			document.body.classList.remove("error-state-active");
			if (profileContentEl) profileContentEl.classList.add("hidden");
			if (treeViewEl) treeViewEl.classList.add("hidden");
			if (fanChartViewEl) {
				fanChartViewEl.style.opacity = "0";
				fanChartViewEl.style.transition = "opacity 0.2s ease";
				fanChartViewEl.classList.remove("hidden");
			}
		} else if (mode === "profile") {
			document.body.classList.remove("error-state-active");
			if (treeViewEl) {
				treeViewEl.classList.add("hidden");
				treeViewEl.style.opacity = "1";
				treeViewEl.style.transition = "";
			}
			if (fanChartViewEl) fanChartViewEl.classList.add("hidden");
			if (profileContentEl) profileContentEl.classList.remove("hidden");
		} else if (mode === "analytics") {
			document.body.classList.remove("error-state-active");
			if (treeViewEl) treeViewEl.classList.add("hidden");
			if (fanChartViewEl) fanChartViewEl.classList.add("hidden");
			if (profileContentEl) profileContentEl.classList.add("hidden");
			if (analyticsViewEl) analyticsViewEl.classList.remove("hidden");
		}
		
		const breadcrumbsEl = document.getElementById("breadcrumbs-container");
		if (breadcrumbsEl) {
		    if (mode === "analytics") breadcrumbsEl.style.display = "none";
		    else breadcrumbsEl.style.display = "";
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
		this._updateViewToggleButton("tree");
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

	_renderCircle(id, engine) {
		this._setUIVisibility("circle");
		const fanChartViewEl = document.getElementById("fan-chart-view");
		if (this.app.managers.fanChart) {
			this.app.managers.fanChart.render(id);
			requestAnimationFrame(() => {
				if (fanChartViewEl) fanChartViewEl.style.opacity = "1";
			});
		} else {
			if (fanChartViewEl) fanChartViewEl.style.opacity = "1";
		}
		this._updateViewToggleButton("circle");
	}

	_updateViewToggleButton(view) {
		const btn = document.getElementById("btn-view-toggle");
		if (!btn) return;
		const icon = btn.querySelector("i");
		if (view === "circle" || view === "fan") {
			btn.classList.add("active");
			btn.setAttribute("title", "Родове дерево");
			btn.setAttribute("aria-label", "Перемкнути на дерево");
			if (icon) icon.className = "ri-node-tree";
		} else {
			btn.classList.remove("active");
			btn.setAttribute("title", "Коло роду");
			btn.setAttribute("aria-label", "Перемкнути на коло роду");
			if (icon) icon.className = "ri-pie-chart-2-line";
		}
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

		if (viewParam === "analytics") {
			this._setUIVisibility("analytics");
			if (managers.analytics) managers.analytics.render();
		} else if (viewParam === "profile") {
			this._renderProfile(personData);
		} else if (viewParam === "circle" || viewParam === "fan") {
			this._renderCircle(id, engine);
		} else {
			this._renderTree(id, engine);
		}

		managers.navigation?.start(id);

		if (typeof managers.lineage?.logic?.buildPath === "function") {
			const path = managers.lineage.logic.buildPath(id);
			managers.breadcrumbs?.renderPath(path);
		}
	}
}
