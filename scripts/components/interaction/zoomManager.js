// scripts/components/interaction/zoomManager.js

import { UI_CLASSES } from "../../core/uiClasses.js";

export class ZoomManager {
	constructor() {
		this.wrapper = document.querySelector(`.${UI_CLASSES.treeContainer}`);
		this.controlsContainer = document.querySelector(
			`.${UI_CLASSES.zoomControls}`,
		);

		this.btnIn = document.getElementById("btn-zoom-in");
		this.btnOut = document.getElementById("btn-zoom-out");
		this.btnReset = document.getElementById("btn-zoom-reset");
		this.display = document.getElementById("zoom-level-display");

		this.currentScale = 1;
		this.targetScale = 1;
		this.currentX = 0;
		this.currentY = 0;
		this.targetX = 0;
		this.targetY = 0;

		this.step = 0.25;
		this.minScale = 0.15;
		this.maxScale = 4.0;
		this.lerpFactor = 0.25;

		this.isAnimating = false;
		this.isDragging = false;
		this._isCentering = false;
		this._mutationTimer = null;
		this.animationFrameId = null;

		this.dragStartX = 0;
		this.dragStartY = 0;
		this.dragStartTargetX = 0;
		this.dragStartTargetY = 0;

		this.target = null;
		this.observer = null;

		this.baseTopPadding = 120;

		this._handleWheel = this._handleWheel.bind(this);
		this._handleMouseDown = this._handleMouseDown.bind(this);
		this._handleMouseMove = this._handleMouseMove.bind(this);
		this._handleMouseUp = this._handleMouseUp.bind(this);
		this._handleTouchStart = this._handleTouchStart.bind(this);
		this._handleTouchMove = this._handleTouchMove.bind(this);
		this._handleTouchEnd = this._handleTouchEnd.bind(this);
		this._animateLoop = this._animateLoop.bind(this);
		this._handleZoomIn = () => this.zoomByButton(1);
		this._handleZoomOut = () => this.zoomByButton(-1);
		this._handleReset = () => this.reset(false);
		this._preventNativeZoom = this._preventNativeZoom.bind(this);

		this.init();
	}

	get isMobile() {
		return (
			window.innerWidth < 768 ||
			window.matchMedia("(max-width: 767px)").matches
		);
	}

	get isRelationshipMode() {
		return new URL(window.location).searchParams.get("mode") === "relationship";
	}

	_cleanupMobile() {
		if (this.controlsContainer) {
			this.controlsContainer.classList.add(UI_CLASSES.hidden || "hidden");
		}
		if (this.wrapper) {
			this.wrapper.style.overflow = "";
			this.wrapper.style.cursor = "";
		}
		const t = document.getElementById("tree-root");
		if (t) {
			t.style.transform = "";
			t.style.transition = "";
			t.style.transformOrigin = "";
			t.style.margin = "";
			t.style.minWidth = "";
			t.style.minHeight = "";
			t.style.position = "";
			t.style.left = "";
			t.style.top = "";
		}
	}

	init() {
		if (!this.wrapper) return;

		if (this.isMobile) {
			this._cleanupMobile();
			return;
		}

		this.getTarget();

		this.wrapper.style.overflow = "hidden";
		this.wrapper.style.cursor = "grab";

		if (this.btnIn) this.btnIn.addEventListener("click", this._handleZoomIn);
		if (this.btnOut) this.btnOut.addEventListener("click", this._handleZoomOut);
		if (this.btnReset)
			this.btnReset.addEventListener("click", this._handleReset);

		document.addEventListener("wheel", this._preventNativeZoom, {
			passive: false,
		});

		this.wrapper.addEventListener("wheel", this._handleWheel, {
			passive: false,
			capture: true,
		});
		this.wrapper.addEventListener("mousedown", this._handleMouseDown, {
			capture: true,
		});
		window.addEventListener("mousemove", this._handleMouseMove);
		window.addEventListener("mouseup", this._handleMouseUp);
		this.wrapper.addEventListener("mouseleave", this._handleMouseUp);

		this.wrapper.addEventListener("touchstart", this._handleTouchStart, { passive: false });
		window.addEventListener("touchmove", this._handleTouchMove, { passive: false });
		window.addEventListener("touchend", this._handleTouchEnd);
		window.addEventListener("touchcancel", this._handleTouchEnd);

		this.updateUI();
	}

	getTarget() {
		if (this.isMobile) {
			this._cleanupMobile();
			return null;
		}

		let t = document.getElementById("tree-root");
		if (t && t !== this.target) {
			this.target = t;

			this.target.style.position = "absolute";
			this.target.style.left = "0px";
			this.target.style.top = "0px";
			this.target.style.margin = "0px";
			this.target.style.transformOrigin = "0 0";
			this.target.style.setProperty("transition", "none", "important");

			this.target.style.minWidth = "max-content";
			this.target.style.width = "max-content";
			this.target.style.minHeight = "max-content";

			if (this.observer) this.observer.disconnect();
			this.observer = new MutationObserver((mutations) => {
				if (this.isMobile) return;
				const hasChanges = mutations.some(
					(m) =>
						m.type === "childList" &&
						(m.addedNodes.length > 0 || m.removedNodes.length > 0),
				);
				if (hasChanges) {
					if (this._mutationTimer) clearTimeout(this._mutationTimer);
					this._mutationTimer = setTimeout(() => {
						if (this.isRelationshipMode) {
							this.centerWholeTree(true);
						} else {
							const rootCard = this.target.querySelector(
								`.${UI_CLASSES.treeNode}`,
							);
							if (rootCard) this.centerOnElement(rootCard, true, false);
						}
					}, 30);
				}
			});
			this.observer.observe(this.target, { childList: true, subtree: true });

			if (this.isRelationshipMode) {
				this.centerWholeTree(true);
			} else {
				const rootCard = this.target.querySelector(`.${UI_CLASSES.treeNode}`);
				if (rootCard) this.centerOnElement(rootCard, true, false);
			}
		}
		return this.target;
	}

	_preventNativeZoom(e) {
		if (e.ctrlKey || e.metaKey) e.preventDefault();
	}

	_handleWheel(e) {
		if (this.isMobile) return;
		e.preventDefault();
		e.stopPropagation();

		if (e.ctrlKey || e.metaKey) {
			const rect = this.wrapper.getBoundingClientRect();
			const mouseX = e.clientX - rect.left;
			const mouseY = e.clientY - rect.top;

			// Зчитування координат відносно поточного візуального стану для створення абсолютного якоря
			const worldX = (mouseX - this.currentX) / this.currentScale;
			const worldY = (mouseY - this.currentY) / this.currentScale;

			const isTouchpad = Math.abs(e.deltaY) < 50;
			const dynamicStep = isTouchpad ? this.step * 0.1 : this.step * 0.5;
			const direction = e.deltaY < 0 ? 1 : -1;

			let nextScale = this.currentScale + direction * dynamicStep;
			nextScale = Math.max(this.minScale, Math.min(this.maxScale, nextScale));

			// Миттєве застосування трансформації усуває дрейф камери
			this.targetScale = nextScale;
			this.currentScale = nextScale;

			this.targetX = mouseX - worldX * this.currentScale;
			this.targetY = mouseY - worldY * this.currentScale;
			this.currentX = this.targetX;
			this.currentY = this.targetY;

			this._applyTransform();
		} else {
			// Панорамування зберігає згладжування (lerp)
			this.targetX -= e.deltaX;
			this.targetY -= e.deltaY;

			if (!this.isAnimating) {
				this.isAnimating = true;
				this.animationFrameId = requestAnimationFrame(this._animateLoop);
			}
		}
	}

	_handleMouseDown(e) {
		if (this.isMobile) return;
		if (e.target.closest("button, a, .btn, .node-actions, input")) return;
		e.stopPropagation();

		this.isDragging = true;
		this.wrapper.style.cursor = "grabbing";
		document.body.style.userSelect = "none";

		this.dragStartX = e.clientX;
		this.dragStartY = e.clientY;
		this.dragStartTargetX = this.targetX;
		this.dragStartTargetY = this.targetY;
	}

	_handleMouseMove(e) {
		if (this.isMobile || !this.isDragging) return;
		e.preventDefault();

		const deltaX = e.clientX - this.dragStartX;
		const deltaY = e.clientY - this.dragStartY;

		this.targetX = this.dragStartTargetX + deltaX;
		this.targetY = this.dragStartTargetY + deltaY;

		this.currentX = this.targetX;
		this.currentY = this.targetY;
		this._applyTransform();
	}

	_handleMouseUp() {
		if (this.isMobile) return;
		if (this.isDragging) {
			this.isDragging = false;
			this.wrapper.style.cursor = "grab";
			document.body.style.userSelect = "";
		}
	}

	_handleTouchStart(e) {
		if (this.isMobile) return;
		if (e.target.closest("button, a, .btn, .node-actions, input")) return;
		
		if (e.touches.length === 1) {
			this.isDragging = true;
			this.dragStartX = e.touches[0].clientX;
			this.dragStartY = e.touches[0].clientY;
			this.dragStartTargetX = this.targetX;
			this.dragStartTargetY = this.targetY;
		} else if (e.touches.length === 2) {
			this.isDragging = false;
			this.isPinching = true;
			this.initialPinchDistance = Math.hypot(
				e.touches[0].clientX - e.touches[1].clientX,
				e.touches[0].clientY - e.touches[1].clientY
			);
			this.initialPinchScale = this.currentScale;
            
			const rect = this.wrapper.getBoundingClientRect();
			this.pinchCenterX = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
			this.pinchCenterY = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top;
		}
	}

	_handleTouchMove(e) {
		if (this.isMobile) return;

		if (this.isPinching && e.touches.length === 2) {
			e.preventDefault();
			const currentDistance = Math.hypot(
				e.touches[0].clientX - e.touches[1].clientX,
				e.touches[0].clientY - e.touches[1].clientY
			);
			
			if (this.initialPinchDistance) {
				const scaleAmount = currentDistance / this.initialPinchDistance;
				let nextScale = this.initialPinchScale * scaleAmount;
				nextScale = Math.max(this.minScale, Math.min(this.maxScale, nextScale));

				const worldX = (this.pinchCenterX - this.currentX) / this.currentScale;
				const worldY = (this.pinchCenterY - this.currentY) / this.currentScale;

				this.targetScale = nextScale;
				this.currentScale = nextScale;
				this.targetX = this.pinchCenterX - worldX * this.currentScale;
				this.targetY = this.pinchCenterY - worldY * this.currentScale;
				this.currentX = this.targetX;
				this.currentY = this.targetY;

				this._applyTransform();
			}
		} else if (this.isDragging && e.touches.length === 1) {
			e.preventDefault();
			const deltaX = e.touches[0].clientX - this.dragStartX;
			const deltaY = e.touches[0].clientY - this.dragStartY;

			this.targetX = this.dragStartTargetX + deltaX;
			this.targetY = this.dragStartTargetY + deltaY;
			this.currentX = this.targetX;
			this.currentY = this.targetY;
			
			this._applyTransform();
		}
	}

	_handleTouchEnd(e) {
		if (this.isMobile) return;
		
		if (e.touches.length < 2) {
			this.isPinching = false;
		}
		if (e.touches.length === 0) {
			this.isDragging = false;
		} else if (e.touches.length === 1) {
			this.isDragging = true;
			this.dragStartX = e.touches[0].clientX;
			this.dragStartY = e.touches[0].clientY;
			this.dragStartTargetX = this.targetX;
			this.dragStartTargetY = this.targetY;
		}
	}

	zoomByButton(direction) {
		if (this.isMobile) return;

		const wrapperRect = this.wrapper.getBoundingClientRect();
		const centerX = wrapperRect.width / 2;
		const centerY = wrapperRect.height / 2;

		const worldX = (centerX - this.targetX) / this.targetScale;
		const worldY = (centerY - this.targetY) / this.targetScale;

		let nextScale = this.targetScale + direction * this.step;
		this.targetScale = Math.max(
			this.minScale,
			Math.min(this.maxScale, nextScale),
		);

		this.targetX = centerX - worldX * this.targetScale;
		this.targetY = centerY - worldY * this.targetScale;

		if (!this.isAnimating) {
			this.isAnimating = true;
			this.animationFrameId = requestAnimationFrame(this._animateLoop);
		}
	}

	_animateLoop() {
		if (!this.isAnimating || this.isMobile) return;

		const diffScale = this.targetScale - this.currentScale;
		const diffX = this.targetX - this.currentX;
		const diffY = this.targetY - this.currentY;

		if (
			Math.abs(diffScale) < 0.001 &&
			Math.abs(diffX) < 0.5 &&
			Math.abs(diffY) < 0.5
		) {
			this.currentScale = this.targetScale;
			this.currentX = this.targetX;
			this.currentY = this.targetY;
			this._applyTransform();
			this.isAnimating = false;
			return;
		}

		this.currentScale += diffScale * this.lerpFactor;
		this.currentX += diffX * this.lerpFactor;
		this.currentY += diffY * this.lerpFactor;

		this._applyTransform();
		this.animationFrameId = requestAnimationFrame(this._animateLoop);
	}

	_applyTransform() {
		if (this.isMobile) return;
		const target = this.getTarget();
		if (!target) return;

		if (this.wrapper.scrollLeft !== 0) this.wrapper.scrollLeft = 0;
		if (this.wrapper.scrollTop !== 0) this.wrapper.scrollTop = 0;

		target.style.transform = `translate(${this.currentX}px, ${this.currentY}px) scale(${this.currentScale})`;
		this.updateUI();
	}

	reset(instant = true) {
		if (this.isMobile) return;
		const target = this.getTarget();
		if (target) {
			if (this.isRelationshipMode) {
				this.centerWholeTree(instant);
			} else {
				const rootCard = target.querySelector(`.${UI_CLASSES.treeNode}`);
				if (rootCard) {
					this.centerOnElement(rootCard, instant, false);
				} else {
					this.currentScale = this.targetScale = 1;
					this.targetX = 0;
					this.targetY = this.baseTopPadding;

					if (instant) {
						this.currentX = this.targetX;
						this.currentY = this.targetY;
						if (this.animationFrameId)
							cancelAnimationFrame(this.animationFrameId);
						this.isAnimating = false;
						this._applyTransform();
					} else if (!this.isAnimating) {
						this.isAnimating = true;
						this.animationFrameId = requestAnimationFrame(this._animateLoop);
					}
				}
			}
		}
	}

	centerWholeTree(instant = true) {
		if (this.isMobile || !this.wrapper || !this.target) return;

		if (this._isCentering) return;
		this._isCentering = true;

		this.targetScale = 1;
		if (instant) this.currentScale = 1;

		const cx = this.target.offsetWidth / 2;
		const wrapperCenterX = this.wrapper.clientWidth / 2;

		this.targetX = wrapperCenterX - cx;
		this.targetY = this.baseTopPadding;

		if (instant) {
			if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
			this.isAnimating = false;
			this.currentX = this.targetX;
			this.currentY = this.targetY;
			this._applyTransform();
		} else {
			if (!this.isAnimating) {
				this.isAnimating = true;
				this.animationFrameId = requestAnimationFrame(this._animateLoop);
			}
		}

		this._isCentering = false;
	}

	centerOnElement(el, instant = true, keepScale = false) {
		if (this.isMobile || !el || !this.wrapper || !this.target) return;

		if (this._isCentering) return;
		this._isCentering = true;

		if (!keepScale) {
			this.targetScale = 1;
			if (instant) this.currentScale = 1;
		}

		let elLeft = 0;
		let elTop = 0;
		let obj = el;

		while (obj && obj !== this.target) {
			elLeft += obj.offsetLeft;
			elTop += obj.offsetTop;
			obj = obj.offsetParent;
		}

		const cx = elLeft + el.offsetWidth / 2;
		const cy = elTop;

		const wrapperCenterX = this.wrapper.clientWidth / 2;

		this.targetX = wrapperCenterX - cx * this.targetScale;
		this.targetY = this.baseTopPadding - cy * this.targetScale;

		if (instant) {
			if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
			this.isAnimating = false;
			this.currentX = this.targetX;
			this.currentY = this.targetY;
			this._applyTransform();
		} else {
			if (!this.isAnimating) {
				this.isAnimating = true;
				this.animationFrameId = requestAnimationFrame(this._animateLoop);
			}
		}

		this._isCentering = false;
	}

	updateUI() {
		if (this.isMobile) return;

		if (this.controlsContainer) {
			this.controlsContainer.classList.remove(UI_CLASSES.hidden || "hidden");
		}

		if (this.display) {
			this.display.textContent = `${Math.round(this.currentScale * 100)}%`;
		}
		if (this.btnIn) this.btnIn.disabled = this.currentScale >= this.maxScale;
		if (this.btnOut) this.btnOut.disabled = this.currentScale <= this.minScale;
	}

	destroy() {
		this.isAnimating = false;
		if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
		if (this._mutationTimer) clearTimeout(this._mutationTimer);
		if (this.observer) this.observer.disconnect();

		document.removeEventListener("wheel", this._preventNativeZoom);

		if (this.wrapper) {
			this.wrapper.removeEventListener("wheel", this._handleWheel, {
				capture: true,
			});
			this.wrapper.removeEventListener("mousedown", this._handleMouseDown, {
				capture: true,
			});
			this.wrapper.removeEventListener("mouseleave", this._handleMouseUp);
		}

		window.removeEventListener("mousemove", this._handleMouseMove);
		window.removeEventListener("mouseup", this._handleMouseUp);
		if (this.wrapper) {
			this.wrapper.removeEventListener("mouseleave", this._handleMouseUp);
			this.wrapper.removeEventListener("mousedown", this._handleMouseDown, { capture: true });
			this.wrapper.removeEventListener("touchstart", this._handleTouchStart);
		}
		window.removeEventListener("touchmove", this._handleTouchMove);
		window.removeEventListener("touchend", this._handleTouchEnd);
		window.removeEventListener("touchcancel", this._handleTouchEnd);

		if (this.btnIn) this.btnIn.removeEventListener("click", this._handleZoomIn);
		if (this.btnOut)
			this.btnOut.removeEventListener("click", this._handleZoomOut);
		if (this.btnReset)
			this.btnReset.removeEventListener("click", this._handleReset);

		this._cleanupMobile();
	}
}
