// scripts/components/interaction/relationshipManager.js

import { COLUMNS } from "../../core/dbSchema.js";
import { renderCardHTML } from "../../components/ui/tree/treeBuilder.js";
import { renderPersonTile } from "../../components/ui/shared/personTile.js";
import { RelationshipCalculator } from "../../services/relationshipCalculator.js";
import { UI_CLASSES } from "../../core/uiClasses.js";
import { resolveRealId } from "../../utils/personUtils.js";

export class RelationshipManager {
	constructor(context, myRootId, callbacks = {}) {
		this.context = context;
		this.myRootId = myRootId;
		this.logic = new RelationshipCalculator(context);

		this.onNavigate = callbacks.onNavigate || window.navigateToId;
		this.onBreadcrumbsUpdate =
			callbacks.onBreadcrumbsUpdate ||
			(window.breadcrumbManager
				? window.breadcrumbManager.renderRelationshipTabs.bind(
						window.breadcrumbManager,
					)
				: null);

		this.currentData = null;
		this.currentIndex = 0;
		this.focusIds = new Set();

		this.boundKeyHandler = this._handleKeyDown.bind(this);
		this.boundTreeClickHandler = this._handleTreeClick.bind(this);

		// Реєстрація обробника для кнопки повернення
		// Реєстрація обробника для кнопки повернення
		this.boundHomeClickHandler = (e) => {
			e.preventDefault();

			// Відновлення базової топології графа
			this.restoreUI(true);

			// Експліцитне схлопування мобільного меню.
			// Знаходимо найближчий вузол меню та ліквідуємо класи активності.
			const menuContainer = e.target.closest(
				".fab-container, .menu-wrapper, [class*='menu']",
			);
			if (menuContainer) {
				menuContainer.classList.remove("active", "is-open", "show", "open");
			}

			// Якщо меню керується зовнішнім тригером (синя кнопка)
			const fabToggle = document.querySelector(".fab-trigger, .menu-toggle");
			if (fabToggle && typeof fabToggle.click === "function") {
				// За потреби симулюємо повторний клік для закриття,
				// якщо зняття класів недостатньо
				fabToggle.classList.remove("active", "is-open");
			}
		};
	}

	showComparison(idA, idB, returnId = null, initialIndex = 0) {
		const realIdA = resolveRealId(idA, this.context);
		const realIdB = resolveRealId(idB, this.context);

		this.currentProfileId = realIdA;
		this.targetProfileId = realIdB;
		this.focusIds = new Set([
			String(realIdA),
			String(realIdB),
			String(this.myRootId),
		]);

		const data = this.logic.calculate(realIdA, realIdB);

		if (!data || data.length === 0) {
			console.warn("Спільних родичів не знайдено.");
			this.restoreUI(true);
			return;
		}

		this.currentData = data;
		this.currentIndex =
			initialIndex >= 0 && initialIndex < data.length ? initialIndex : 0;

		this.prepareUI(realIdA, realIdB, returnId);
		this.renderCurrentScenario(realIdA);
	}

	updateBreadcrumbs() {
		if (!this.onBreadcrumbsUpdate) return;

		const labels = this.currentData.map((scenario) => {
			const names = scenario.root
				.map((p) => `${p.name || ""} ${p.surname || ""}`.trim())
				.filter(Boolean)
				.join(" та ");
			return names ? `Лінія: ${names}` : "Невідома лінія";
		});

		const counts = {};
		const branches = this.currentData.map((scenario, index) => {
			let label = labels[index];

			counts[label] = (counts[label] || 0) + 1;
			if (counts[label] > 1) {
				label = `${label} (${counts[label]})`;
			}

			return {
				label: label,
				id: `rel-tab-${index}`,
				isActive: index === this.currentIndex,
			};
		});

		this.onBreadcrumbsUpdate(branches, this.currentIndex, (newIndex) => {
			this.currentIndex = newIndex;
			this.renderCurrentScenario(this.currentProfileId);
		});
	}

	prepareUI(idA, idB, returnId = null) {
		const url = new URL(window.location);
		const rawId = returnId || idA;
		let displayIdInUrl = rawId;

		if (this.logic?.basicMap?.has(String(rawId))) {
			const person = this.logic.basicMap.get(String(rawId));
			if (person?.[COLUMNS.basic.slug]) {
				displayIdInUrl = person[COLUMNS.basic.slug];
			}
		}

		const currentUrlId = url.searchParams.get("id");
		const isSameState =
			url.searchParams.get("mode") === "relationship" &&
			url.searchParams.get("target_id") === String(idB) &&
			(currentUrlId === String(rawId) ||
				currentUrlId === String(displayIdInUrl));

		url.searchParams.set("mode", "relationship");
		url.searchParams.set("id", displayIdInUrl);
		url.searchParams.set("target_id", idB);
		url.searchParams.set("rel_idx", this.currentIndex);
		url.hash = "";
		url.searchParams.delete("view");
		url.searchParams.delete("rel_p1");
		url.searchParams.delete("rel_p2");

		const stateObj = {
			mode: "relationship",
			id: displayIdInUrl,
			target_id: idB,
			rel_idx: this.currentIndex,
		};

		if (!isSameState) window.history.pushState(stateObj, "", url);
		else window.history.replaceState(stateObj, "", url);

		document
			.getElementById("profile-content")
			?.classList.add(UI_CLASSES.hidden);
		document.getElementById("tree-view")?.classList.remove(UI_CLASSES.hidden);

		["btn-prev", "btn-next"].forEach((id) => {
			document.getElementById(id)?.classList.add(UI_CLASSES.hiddenRelNav);
		});

		document
			.getElementById("btn-lineage-toggle")
			?.classList.remove(UI_CLASSES.hidden, UI_CLASSES.hiddenRelNav);
		document
			.querySelector(`.${UI_CLASSES.zoomControls}`)
			?.classList.remove(UI_CLASSES.hidden);

		const rootEl = document.getElementById("tree-root");
		if (rootEl) {
			rootEl.style.transform = "scale(1)";
			rootEl.style.transformOrigin = "top center";
			rootEl.addEventListener("click", this.boundTreeClickHandler, true);
		}

		// Активація кнопки
		document
			.getElementById("btn-home")
			?.addEventListener("click", this.boundHomeClickHandler);
		document.addEventListener("keydown", this.boundKeyHandler, true);
	}

	restoreUI(updateUrl = true) {
		document.removeEventListener("keydown", this.boundKeyHandler, true);
		document
			.getElementById("btn-home")
			?.removeEventListener("click", this.boundHomeClickHandler);

		const rootEl = document.getElementById("tree-root");
		if (rootEl) {
			rootEl.innerHTML = "";
			rootEl.className = "";
			rootEl.style.transform = "";
			rootEl.removeEventListener("click", this.boundTreeClickHandler, true);
		}

		const dynamicFooter = document.getElementById("rel-dynamic-footer");
		if (dynamicFooter) dynamicFooter.remove();

		const relPrev = document.getElementById("rel-btn-prev");
		const relNext = document.getElementById("rel-btn-next");
		if (relPrev) relPrev.remove();
		if (relNext) relNext.remove();

		document.getElementById("tree-view")?.classList.add(UI_CLASSES.hidden);
		document
			.getElementById("profile-content")
			?.classList.remove(UI_CLASSES.hidden);

		document.querySelectorAll(`.${UI_CLASSES.hiddenRelNav}`).forEach((el) => {
			el.classList.remove(UI_CLASSES.hiddenRelNav);
		});

		if (updateUrl && this.onNavigate) {
			this.onNavigate(this.currentProfileId, true, "tree");
		}
	}

	_handleTreeClick(e) {
		const profileBtn = e.target.closest(
			`.${UI_CLASSES.btnGotoProfile}, .${UI_CLASSES.kinshipCardActions}`,
		);

		if (profileBtn) {
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();

			let targetId = profileBtn.getAttribute("data-profile-id");

			if (!targetId && profileBtn.href) {
				try {
					const url = new URL(profileBtn.href);
					targetId = url.searchParams.get("id");
				} catch (err) {
					console.warn("Помилка парсингу URL:", err);
				}
			}

			if (targetId) {
				this.restoreUI(false);
				this.onNavigate(targetId, false, "profile");
			}
			return;
		}

		const card = e.target.closest(
			`.${UI_CLASSES.treeNode}, .${UI_CLASSES.kinshipCard}`,
		);
		if (
			card &&
			!card.classList.contains(UI_CLASSES.treeNodeUnknown) &&
			!card.classList.contains(UI_CLASSES.nodeNoClick) &&
			!card.classList.contains(UI_CLASSES.kinshipCardPlaceholder)
		) {
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();

			const personId = card.getAttribute("data-id");
			if (personId) {
				this.restoreUI(false);
				this.onNavigate(personId, false, "tree");
			}
		}
	}

	_handleKeyDown(e) {
		if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

		if (e.key === "Escape") {
			this.restoreUI(true);
			return;
		}

		if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
			e.stopImmediatePropagation();
			e.preventDefault();

			if (e.key === "ArrowLeft") this.prevScenario(this.currentProfileId);
			if (e.key === "ArrowRight") this.nextScenario(this.currentProfileId);
		}
	}

	prevScenario(currentProfileId) {
		if (!this.currentData || this.currentData.length <= 1) return;
		const total = this.currentData.length;
		this.currentIndex = (this.currentIndex - 1 + total) % total;
		this.renderCurrentScenario(currentProfileId);
	}

	nextScenario(currentProfileId) {
		if (!this.currentData || this.currentData.length <= 1) return;
		const total = this.currentData.length;
		this.currentIndex = (this.currentIndex + 1) % total;
		this.renderCurrentScenario(currentProfileId);
	}

	renderCurrentScenario(currentProfileId) {
		if (!this.currentData?.[this.currentIndex]) return;

		const url = new URL(window.location);
		if (url.searchParams.get("mode") === "relationship") {
			url.searchParams.set("rel_idx", this.currentIndex);
			window.history.replaceState(window.history.state, "", url);
		}

		this.updateBreadcrumbs();

		const scenario = this.currentData[this.currentIndex];
		const rootEl = document.getElementById("tree-root");
		const total = this.currentData.length;

		scenario.root.forEach((r) => this.focusIds.add(String(r.id)));

		const iconLeft = UI_CLASSES.icons?.arrowLeftSLine || "ri-arrow-left-s-line";
		const iconRight =
			UI_CLASSES.icons?.arrowRightSLine || "ri-arrow-right-s-line";

		const navHTML =
			total > 1
				? `
            <button class="nav-arrow nav-arrow--left" id="rel-btn-prev" aria-label="Попередній варіант">
                <i class="${iconLeft}" aria-hidden="true"></i>
            </button>
            <button class="nav-arrow nav-arrow--right" id="rel-btn-next" aria-label="Наступний варіант">
                <i class="${iconRight}" aria-hidden="true"></i>
            </button>
        `
				: "";

		const isCouple = scenario.root.length > 1;
		const mainNodes = scenario.branch.main || [];
		const sideNodes = scenario.branch.side || [];

		const isMobile = window.matchMedia("(max-width: 768px)").matches;

		let rootHTML = "";
		let branchesAreaHTML = "";

		if (isMobile) {
			const rootNodesMobile = scenario.root.map((p) =>
				this.renderNodeAdapter(p, false),
			);

			if (isCouple) {
				rootHTML = `
				<div class="rel-mobile-grid">
					<div class="rel-mobile-row">
						<div class="rel-mobile-cell">${rootNodesMobile[0]}</div>
						<div class="rel-mobile-cell">${rootNodesMobile[1]}</div>
					</div>
				</div>`;
			} else {
				rootHTML = `
				<div class="rel-mobile-grid">
					<div class="rel-mobile-row rel-mobile-row--merged">
						<div class="rel-mobile-cell rel-mobile-cell--center">${rootNodesMobile[0]}</div>
					</div>
				</div>`;
			}

			const maxLen = Math.max(mainNodes.length, sideNodes.length);
			let gridRowsHTML = "";

			for (let i = 0; i < maxLen; i++) {
				const nodeA = mainNodes[i];
				const nodeB = sideNodes[i];
				const isMerged = !!(
					nodeA &&
					nodeB &&
					String(nodeA.id) === String(nodeB.id)
				);

				if (isMerged) {
					gridRowsHTML += `
					<div class="rel-mobile-row rel-mobile-row--merged">
						<div class="rel-mobile-cell rel-mobile-cell--center">
							${this.renderNodeAdapter(nodeA, false)}
						</div>
					</div>`;
				} else {
					const emptyCardHtml = `<div class="${UI_CLASSES.kinshipCard} ${UI_CLASSES.kinshipCardPlaceholder} rel-invisible-node" style="opacity:0; pointer-events:none; border:none; box-shadow:none; background:transparent;"></div>`;

					const cardA = nodeA
						? this.renderNodeAdapter(nodeA, false)
						: emptyCardHtml;
					const cardB = nodeB
						? this.renderNodeAdapter(nodeB, true)
						: emptyCardHtml;

					gridRowsHTML += `
					<div class="rel-mobile-row">
						<div class="rel-mobile-cell">${cardA}</div>
						<div class="rel-mobile-cell">${cardB}</div>
					</div>`;
				}
			}
			branchesAreaHTML = `<div class="rel-mobile-grid">${gridRowsHTML}</div>`;
		} else {
			const rootNodes = scenario.root
				.map((p) => this.renderNodeAdapter(p, false))
				.join("");
			rootHTML = `
				<div class="${UI_CLASSES.relLevelRoot}">
					<div class="${UI_CLASSES.relCoupleContainer} ${isCouple ? UI_CLASSES.isCouple : ""}">
						${rootNodes}
					</div>
				</div>
			`;

			const maxLen = Math.max(mainNodes.length, sideNodes.length);
			const chunks = [];
			let currentChunk = null;

			for (let i = 0; i < maxLen; i++) {
				const nodeA = mainNodes[i];
				const nodeB = sideNodes[i];
				const isMerged = !!(
					nodeA &&
					nodeB &&
					String(nodeA.id) === String(nodeB.id)
				);

				if (!currentChunk || currentChunk.isMerged !== isMerged) {
					currentChunk = { isMerged, itemsA: [], itemsB: [], mergedItems: [] };
					chunks.push(currentChunk);
				}

				if (isMerged) {
					currentChunk.mergedItems.push(nodeA);
				} else {
					currentChunk.itemsA.push(nodeA);
					currentChunk.itemsB.push(nodeB);
				}
			}

			const buildStack = (list, isIndirect, hasNextChunk, isConverging) =>
				list
					.map((p, idx) => {
						const isLast = idx === list.length - 1;
						const drawLine = !isLast ? true : hasNextChunk && !isConverging;
						let cardHTML = "";
						let dashedClass = "";

						if (p) {
							cardHTML = this.renderNodeAdapter(p, isIndirect);
							const nextNode = !isLast ? list[idx + 1] : null;
							if (nextNode && ["hypothetical", ""].includes(nextNode.status)) {
								dashedClass = UI_CLASSES.dashedLine || "dashed-line";
							}
						} else {
							cardHTML = `<div class="${UI_CLASSES.treeNode} ${UI_CLASSES.relInvisibleNode}"></div>`;
						}

						if (drawLine) {
							return `
						<div class="${UI_CLASSES.relNodeWrapper}">
							${cardHTML}
							<div class="${UI_CLASSES.relLineDown} ${dashedClass}"></div>
						</div>`;
						}
						return `<div class="${UI_CLASSES.relNodeWrapper}">${cardHTML}</div>`;
					})
					.join("");

			chunks.forEach((chunk, index) => {
				const hasNextChunk = index < chunks.length - 1;
				const nextChunk = hasNextChunk ? chunks[index + 1] : null;
				const isConverging =
					!chunk.isMerged && hasNextChunk && nextChunk.isMerged;

				if (chunk.isMerged) {
					const stack = buildStack(
						chunk.mergedItems,
						false,
						hasNextChunk,
						false,
					);
					branchesAreaHTML += `<div class="${UI_CLASSES.relBranchSingle}">${stack}</div>`;
				} else {
					let itemsA = [...chunk.itemsA];
					let itemsB = [...chunk.itemsB];

					if (!isConverging) {
						while (itemsA.length > 0 && !itemsA[itemsA.length - 1])
							itemsA.pop();
						while (itemsB.length > 0 && !itemsB[itemsB.length - 1])
							itemsB.pop();
					}

					const hasA = itemsA.some((n) => !!n);
					const hasB = itemsB.some((n) => !!n);

					if (hasA && hasB) {
						const stackA = buildStack(
							itemsA,
							false,
							hasNextChunk,
							isConverging,
						);
						const stackB = buildStack(itemsB, true, hasNextChunk, isConverging);
						const bracketLeft =
							isConverging && itemsA.length > 0
								? `<div class="${UI_CLASSES.relMergeBracket} ${UI_CLASSES.relMergeLeft}"></div>`
								: "";
						const bracketRight =
							isConverging && itemsB.length > 0
								? `<div class="${UI_CLASSES.relMergeBracket} ${UI_CLASSES.relMergeRight}"></div>`
								: "";
						const padClass = isConverging ? UI_CLASSES.relColPadded : "";

						branchesAreaHTML += `
						<div class="${UI_CLASSES.relBranchBridge}">
							<div class="${UI_CLASSES.relBranchConnector} ${padClass}">
								${stackA}
								${bracketLeft}
							</div>
							<div class="${UI_CLASSES.relBranchConnector} ${padClass}">
								${stackB}
								${bracketRight}
							</div>
						</div>`;
					} else if (hasA || hasB) {
						const items = hasA ? itemsA : itemsB;
						const isIndirect = !hasA;
						const stack = buildStack(
							items,
							isIndirect,
							hasNextChunk,
							isConverging,
						);
						branchesAreaHTML += `<div class="${UI_CLASSES.relBranchSingle}">${stack}</div>`;
					}
				}
			});
		}

		const info = scenario.info;
		const buildRow = (label, value) =>
			value
				? `<div class="${UI_CLASSES.relRow}"><div class="${UI_CLASSES.relLbl}">${label}</div><div class="${UI_CLASSES.relVal}">${value}</div></div>`
				: "";
		const leftInfo = buildRow("Родич &rarr; Профіль", info.targetToIndirect);
		const rightInfo = buildRow("Профіль &rarr; Родич", info.indirectToTarget);

		rootEl.innerHTML = `<div class="${UI_CLASSES.relTreeWrapper}">${rootHTML}${branchesAreaHTML}</div>`;
		rootEl.className = `${UI_CLASSES.genealogyTree} ${UI_CLASSES.relationshipMode}`;

		const treeViewEl = document.getElementById("tree-view");
		let oldFooter = document.getElementById("rel-dynamic-footer");
		if (oldFooter) oldFooter.remove();

		const oldPrev = document.getElementById("rel-btn-prev");
		const oldNext = document.getElementById("rel-btn-next");
		if (oldPrev) oldPrev.remove();
		if (oldNext) oldNext.remove();

		if (treeViewEl) {
			treeViewEl.insertAdjacentHTML(
				"beforeend",
				`<div id="rel-dynamic-footer" class="${UI_CLASSES.relFooterUnified}"><div class="${UI_CLASSES.relFooterCol} ${UI_CLASSES.relFooterColLeft}">${leftInfo}</div><div class="${UI_CLASSES.relFooterSep}" aria-hidden="true"></div><div class="${UI_CLASSES.relFooterCol} ${UI_CLASSES.relFooterColRight}">${rightInfo}</div></div>`,
			);
			if (navHTML) treeViewEl.insertAdjacentHTML("beforeend", navHTML);
		}

		const btnPrev = document.getElementById("rel-btn-prev");
		const btnNext = document.getElementById("rel-btn-next");
		if (btnPrev) btnPrev.onclick = () => this.prevScenario(currentProfileId);
		if (btnNext) btnNext.onclick = () => this.nextScenario(currentProfileId);

		setTimeout(() => {
			const activeItem = document.querySelector(
				`#breadcrumbs-list .${UI_CLASSES.breadcrumbsLinkActive}`,
			);
			if (activeItem)
				activeItem.scrollIntoView({
					behavior: "smooth",
					block: "nearest",
					inline: "center",
				});
		}, 150);
	}

	renderNodeAdapter(personObj, isRightBranch) {
		if (!personObj) return "";

		const isMobile = window.matchMedia("(max-width: 768px)").matches;

		if (isMobile) {
			const isPlaceholder =
				personObj.type === "unknown" || personObj.source === "unknown";

			const tileOptions = {
				useCaps: false,
				uppercaseSurname: false,
				showMaidenName: false,
				disablePopup: true,
			};

			let html = renderPersonTile(
				personObj,
				window.app?.engine || this.context,
				"",
				isPlaceholder,
				tileOptions,
			);

			let extraClasses = [];

			if (personObj.type === "indirect") {
				extraClasses.push(UI_CLASSES.nodeIndirect);
			}

			if (this.focusIds.size > 0 && !this.focusIds.has(String(personObj.id))) {
				extraClasses.push(UI_CLASSES.nodeDimmed);
			}

			if (
				personObj.status === "hypothetical" &&
				!html.includes(UI_CLASSES.hypothetical)
			) {
				extraClasses.push(UI_CLASSES.hypothetical);
			}

			if (isRightBranch && personObj.type === "indirect") {
				extraClasses.push(UI_CLASSES.nodeNoClick);
				html = html.replace(
					/<a[^>]*class="[^"]*kinship-card__actions[^"]*"[^>]*>.*?<\/a>/g,
					"",
				);
			}

			if (
				extraClasses.length > 0 &&
				html.includes(`class="${UI_CLASSES.kinshipCard}`)
			) {
				html = html.replace(
					`class="${UI_CLASSES.kinshipCard}`,
					`class="${UI_CLASSES.kinshipCard} ${extraClasses.join(" ")}`,
				);
			}

			return html;
		} else {
			if (personObj.type === "unknown") {
				return `<div class="${UI_CLASSES.treeNode} ${UI_CLASSES.treeNodeUnknown} ${UI_CLASSES.noHover} ${UI_CLASSES.hypothetical} ${UI_CLASSES.relNodePlaceholder}">Невідомо</div>`;
			}

			let html = renderCardHTML(
				personObj,
				personObj.id,
				window.app?.engine || this.context,
				personObj.type,
			);

			let extraClasses = [];

			if (personObj.type === "indirect") {
				extraClasses.push(UI_CLASSES.nodeIndirect);
			} else {
				const isFem = ["f", "female", "w", "ж"].includes(
					String(personObj.gender).toLowerCase(),
				);
				const genderClass = isFem
					? UI_CLASSES.treeNodeFemale
					: UI_CLASSES.treeNodeMale;
				if (!html.includes(genderClass)) extraClasses.push(genderClass);
			}

			if (this.focusIds.size > 0 && !this.focusIds.has(String(personObj.id))) {
				extraClasses.push(UI_CLASSES.nodeDimmed);
			}

			if (
				personObj.status === "hypothetical" &&
				!html.includes(UI_CLASSES.hypothetical)
			) {
				extraClasses.push(UI_CLASSES.hypothetical);
			}

			if (isRightBranch && personObj.type === "indirect") {
				extraClasses.push(UI_CLASSES.nodeNoClick);
				html = html.replace(
					/<button class=".*?btn-goto-profile.*?".*?<\/button>/s,
					"",
				);
			}

			if (
				extraClasses.length > 0 &&
				html.includes(`class="${UI_CLASSES.treeNode}`)
			) {
				html = html.replace(
					`class="${UI_CLASSES.treeNode}`,
					`class="${UI_CLASSES.treeNode} ${extraClasses.join(" ")}`,
				);
			}

			return html;
		}
	}
}
