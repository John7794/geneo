// scripts/components/interaction/stickyHeaderManager.js

import { UI_CLASSES } from "../../core/uiClasses.js";

export class StickyHeaderManager {
	constructor(options = {}) {
		this.ticking = false;
		this.collapseThreshold = options.collapseThreshold || 60;
		this.expandedHeight = 0;

		this.headerNode = null;
		this.placeholderNode = null;

		this.onScroll = this.onScroll.bind(this);
		this.syncLayout = this.syncLayout.bind(this);
		this._acquireElements = this._acquireElements.bind(this);

		this.init();
	}

	_acquireElements() {
		this.headerNode = document.getElementById("sticky-header");
		this.placeholderNode = document.querySelector(
			`.${UI_CLASSES.profileHeaderPlaceholder}`,
		);
		return this.headerNode && this.placeholderNode;
	}

	init() {
		window.addEventListener("scroll", this.onScroll, { passive: true });
		window.addEventListener("resize", this.syncLayout, { passive: true });

		this.observer = new ResizeObserver(() => {
			window.requestAnimationFrame(this.syncLayout);
		});

		const tryHydrate = (attempts = 0) => {
			if (this._acquireElements()) {
				this.observer.observe(this.placeholderNode);
				this.syncLayout();
				this.onScroll();
			} else if (attempts < 20) {
				setTimeout(() => tryHydrate(attempts + 1), 50);
			}
		};

		tryHydrate();
	}

	syncLayout() {
		if (!this.headerNode || !this.placeholderNode) {
			if (!this._acquireElements()) return;
		}

		const isCollapsed = this.headerNode.classList.contains(
			UI_CLASSES.isCollapsed,
		);

		const hHeight = this.headerNode.offsetHeight;
		const rect = this.placeholderNode.getBoundingClientRect();
		const pWidth = rect.width;
		const pLeft = rect.left;

		if (pWidth <= 0) return;

		if (!isCollapsed && hHeight > 0) {
			this.expandedHeight = hHeight;
			this.placeholderNode.style.height = `${hHeight}px`;
		} else if (this.expandedHeight > 0) {
			this.placeholderNode.style.height = `${this.expandedHeight}px`;
		}

		this.headerNode.style.width = `${pWidth}px`;
		this.headerNode.style.left = `${pLeft}px`;
	}

	onScroll() {
		if (!this.ticking) {
			window.requestAnimationFrame(() => {
				if (!this.headerNode || !this.placeholderNode) {
					this._acquireElements();
				}

				if (
					this.headerNode &&
					this.placeholderNode
				) {
					if (
						!this.headerNode.style.width ||
						this.headerNode.style.width === "0px"
					) {
						this.syncLayout();
					}

					const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
					const isCollapsed = this.headerNode.classList.contains(
						UI_CLASSES.isCollapsed,
					);

					if (scrollY > this.collapseThreshold) {
						if (!isCollapsed) {
							this.headerNode.classList.add(UI_CLASSES.isCollapsed);
						}
					} else {
						if (isCollapsed) {
							this.headerNode.classList.remove(UI_CLASSES.isCollapsed);
						}
					}
				}
				this.ticking = false;
			});
			this.ticking = true;
		}
	}

	destroy() {
		window.removeEventListener("scroll", this.onScroll);
		window.removeEventListener("resize", this.syncLayout);
		if (this.observer) this.observer.disconnect();

		this.headerNode = null;
		this.placeholderNode = null;
	}
}
