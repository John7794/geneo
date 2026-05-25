// scripts/components/interaction/dragScrollManager.js

import { UI_CLASSES } from "../../core/uiClasses.js";

/**
 * Додає можливість прокрутки контенту за допомогою перетягування мишкою або пальцем.
 * @param {HTMLElement} container - DOM елемент, який потрібно скролити
 * @returns {Function|null} - Функція для очищення слухачів подій (destroy)
 */
export function enableDragScroll(container) {
	if (!container) return null;

	let isDown = false;
	let hasDragged = false;
	let startX, startY, scrollLeft, scrollTop;
	let animationFrameId = null;
	let currentX, currentY;

	const getCoords = (e) => {
		if (e.touches && e.touches.length > 0) {
			return { x: e.touches[0].pageX, y: e.touches[0].pageY };
		}
		return { x: e.pageX, y: e.pageY };
	};

	const startDragging = (e) => {
		// 🔥 Захист 1: Ігноруємо праву/середню кнопку миші
		if (e.type === "mousedown" && e.button !== 0) return;

		// 🔥 Захист 2: Ігноруємо мультитач (щоб працював зум двома пальцями)
		if (e.touches && e.touches.length > 1) return;

		isDown = true;
		hasDragged = false;

		container.classList.remove(UI_CLASSES.isDraggable);
		container.classList.add(UI_CLASSES.isDragging);

		const coords = getCoords(e);
		startX = coords.x - container.offsetLeft;
		startY = coords.y - container.offsetTop;
		scrollLeft = container.scrollLeft;
		scrollTop = container.scrollTop;
	};

	const stopDragging = () => {
		if (!isDown) return; // Запобігаємо зайвим викликам
		isDown = false;

		container.classList.remove(UI_CLASSES.isDragging);
		container.classList.add(UI_CLASSES.isDraggable);

		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
	};

	const move = (e) => {
		if (!isDown) return;
		// Захист від мультитачу під час руху
		if (e.touches && e.touches.length > 1) return;

		const coords = getCoords(e);
		currentX = coords.x - container.offsetLeft;
		currentY = coords.y - container.offsetTop;

		const walkX = currentX - startX;
		const walkY = currentY - startY;

		if (Math.abs(walkX) > 3 || Math.abs(walkY) > 3) {
			hasDragged = true;
			if (e.cancelable) e.preventDefault();
		}

		if (!animationFrameId) {
			animationFrameId = requestAnimationFrame(() => {
				const finalWalkX = currentX - startX;
				const finalWalkY = currentY - startY;

				container.scrollLeft = scrollLeft - finalWalkX;
				container.scrollTop = scrollTop - finalWalkY;

				animationFrameId = null;
			});
		}
	};

	const preventClickIfDragged = (e) => {
		if (hasDragged) {
			e.preventDefault();
			e.stopPropagation();
			hasDragged = false;
		}
	};

	// Ініціалізація
	container.classList.add(UI_CLASSES.isDraggable);

	// Слухачі миші
	container.addEventListener("mousedown", startDragging);
	container.addEventListener("mouseleave", stopDragging);
	container.addEventListener("mouseup", stopDragging);
	container.addEventListener("mousemove", move);

	// Запобіжник кліку
	container.addEventListener("click", preventClickIfDragged, true);

	return function destroy() {
		container.removeEventListener("mousedown", startDragging);
		container.removeEventListener("mouseleave", stopDragging);
		container.removeEventListener("mouseup", stopDragging);
		container.removeEventListener("mousemove", move);

		container.removeEventListener("click", preventClickIfDragged, true);

		container.classList.remove(UI_CLASSES.isDraggable);
		container.classList.remove(UI_CLASSES.isDragging);

		if (animationFrameId) cancelAnimationFrame(animationFrameId);
	};
}
