export class NavigationManager {
	constructor(queue, onNavigate) {
		this.queue = queue || [];
		this.onNavigate = onNavigate;
		this._handleKeyDown = this._handleKeyDown.bind(this);
		document.addEventListener("keydown", this._handleKeyDown);
	}

	updateList(newQueue) {
		this.queue = Array.isArray(newQueue) ? newQueue : [];
	}

	_getCurrentId() {
		return window.location.hash.replace("#", "") || "1";
	}

	_handleKeyDown(e) {
		if (
			e.target.tagName === "INPUT" ||
			e.target.tagName === "TEXTAREA" ||
			e.target.isContentEditable
		) {
			return;
		}

		if (this.queue.length <= 1) return;

		const currentId = this._getCurrentId();
		let currentIndex = this.queue.indexOf(currentId);

		// Якщо поточного ID немає в черзі, беремо корінь (індекс 0)
		if (currentIndex === -1) {
			currentIndex = 0;
		}

		if (e.key === "ArrowLeft") {
			let prevIndex = currentIndex - 1;
			if (prevIndex < 0) prevIndex = this.queue.length - 1;
			if (this.onNavigate) {
				this.onNavigate(this.queue[prevIndex]);
			}
		} else if (e.key === "ArrowRight") {
			let nextIndex = currentIndex + 1;
			if (nextIndex >= this.queue.length) nextIndex = 0;
			if (this.onNavigate) {
				this.onNavigate(this.queue[nextIndex]);
			}
		}
	}
}
