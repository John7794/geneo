// ./scripts/components/interaction/gedcomManager.js

import { parseGedcom, exportGeneoToGedcom, convertGedcomToGeneo } from "../../services/gedcom/index.js";

/**
 * Менеджер модального вікна GEDCOM (Імпорт та Експорт генеалогічних даних)
 */
export class GedcomManager {
	constructor(engine) {
		this.engine = engine;
		this.overlay = document.getElementById("gedcom-overlay");
		this.btnOpen = document.getElementById("btn-gedcom");
		this.currentParsedGedcom = null;

		this._init();
	}

	_init() {
		if (this.btnOpen) {
			this.btnOpen.addEventListener("click", (e) => {
				e.preventDefault();
				this.open();
			});
		}

		document.addEventListener("click", (e) => {
			if (e.target.closest("#btn-gedcom, .js-open-gedcom")) {
				e.preventDefault();
				this.open();
			}
		});

		if (this.overlay) {
			const closeBtn = this.overlay.querySelector(".js-close-popup");
			if (closeBtn) {
				closeBtn.addEventListener("click", () => this.close());
			}

			this.overlay.addEventListener("click", (e) => {
				if (e.target === this.overlay) this.close();
			});
		}

		this._setupTabs();
		this._setupExport();
		this._setupImport();
	}

	open() {
		if (this.overlay) {
			this.overlay.classList.remove("hidden");
			this.overlay.classList.add("show");
			this.overlay.classList.add("open");
			this.overlay.setAttribute("aria-hidden", "false");
			this._updateExportStats();
		}
	}

	close() {
		if (this.overlay) {
			this.overlay.classList.add("hidden");
			this.overlay.classList.remove("show");
			this.overlay.classList.remove("open");
			this.overlay.setAttribute("aria-hidden", "true");
		}
	}

	_setupTabs() {
		if (!this.overlay) return;
		const tabs = this.overlay.querySelectorAll(".gedcom-tab-btn");
		const panels = this.overlay.querySelectorAll(".gedcom-tab-panel");

		tabs.forEach((tab) => {
			tab.addEventListener("click", () => {
				tabs.forEach((t) => {
					t.classList.remove("active");
					t.style.borderBottom = "2px solid transparent";
					t.style.color = "var(--color-text-muted)";
				});
				panels.forEach((p) => p.classList.add("hidden"));

				tab.classList.add("active");
				tab.style.borderBottom = "2px solid var(--color-primary)";
				tab.style.color = "var(--color-text-main)";
				const targetId = tab.getAttribute("data-target");
				const targetPanel = this.overlay.querySelector(targetId);
				if (targetPanel) targetPanel.classList.remove("hidden");
			});
		});
	}

	_updateExportStats() {
		const statPersons = this.overlay?.querySelector("#gedcom-export-stat-persons");
		const statFamilies = this.overlay?.querySelector("#gedcom-export-stat-families");
		const statPlaces = this.overlay?.querySelector("#gedcom-export-stat-places");

		const db = this.engine?.db || {};
		const pCount = (db.basic || []).length;
		const fCount = (db.families || []).length;
		const plCount = (db.places || []).length;

		if (statPersons) statPersons.textContent = pCount.toLocaleString();
		if (statFamilies) statFamilies.textContent = fCount.toLocaleString();
		if (statPlaces) statPlaces.textContent = plCount.toLocaleString();
	}

	_setupExport() {
		const btnExport = this.overlay?.querySelector("#btn-do-gedcom-export");
		if (!btnExport) return;

		btnExport.addEventListener("click", () => {
			try {
				btnExport.disabled = true;
				btnExport.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Формування файлу...`;

				setTimeout(() => {
					const db = this.engine?.db || {};
					const gedcomContent = exportGeneoToGedcom(db);

					const blob = new Blob([gedcomContent], { type: "text/plain;charset=utf-8" });
					const url = URL.createObjectURL(blob);
					const a = document.createElement("a");
					const dateStr = new Date().toISOString().slice(0, 10);
					a.href = url;
					a.download = `Geneo_Family_Tree_${dateStr}.ged`;
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
					URL.revokeObjectURL(url);

					btnExport.disabled = false;
					btnExport.innerHTML = `<i class="ri-check-line"></i> Успішно завантажено!`;
					setTimeout(() => {
						btnExport.innerHTML = `<i class="ri-download-2-line"></i> Завантажити файл .ged`;
					}, 3000);
				}, 100);
			} catch (err) {
				console.error("Помилка експорту GEDCOM:", err);
				alert("Помилка при експорті: " + err.message);
				btnExport.disabled = false;
				btnExport.innerHTML = `<i class="ri-download-2-line"></i> Завантажити файл .ged`;
			}
		});
	}

	_setupImport() {
		const dropZone = this.overlay?.querySelector("#gedcom-drop-zone");
		const fileInput = this.overlay?.querySelector("#gedcom-file-input");
		const btnSelect = this.overlay?.querySelector("#btn-select-gedcom-file");

		if (!dropZone || !fileInput) return;

		if (btnSelect) {
			btnSelect.addEventListener("click", (e) => {
				e.stopPropagation();
				fileInput.click();
			});
		}

		dropZone.addEventListener("click", (e) => {
			if (e.target !== btnSelect) {
				fileInput.click();
			}
		});

		dropZone.addEventListener("dragover", (e) => {
			e.preventDefault();
			dropZone.classList.add("dragover");
		});

		dropZone.addEventListener("dragleave", () => {
			dropZone.classList.remove("dragover");
		});

		dropZone.addEventListener("drop", (e) => {
			e.preventDefault();
			dropZone.classList.remove("dragover");
			if (e.dataTransfer.files && e.dataTransfer.files[0]) {
				this._handleFile(e.dataTransfer.files[0]);
			}
		});

		fileInput.addEventListener("change", (e) => {
			if (e.target.files && e.target.files[0]) {
				this._handleFile(e.target.files[0]);
			}
		});
	}

	_handleFile(file) {
		if (!file.name.toLowerCase().endsWith(".ged") && !file.name.toLowerCase().endsWith(".gedcom")) {
			alert("Будь ласка, оберіть файл формату .ged або .gedcom");
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const content = e.target.result;
				this.currentParsedGedcom = parseGedcom(content);
				this._renderPreview(this.currentParsedGedcom, file.name, file.size);
			} catch (err) {
				console.error("Помилка читання GEDCOM:", err);
				alert("Не вдалося розпарсити файл: " + err.message);
			}
		};
		reader.readAsText(file, "UTF-8");
	}

	_renderPreview(parsed, fileName, fileSize) {
		const previewContainer = this.overlay?.querySelector("#gedcom-import-preview");
		const dropZone = this.overlay?.querySelector("#gedcom-drop-zone");
		if (!previewContainer) return;

		if (dropZone) dropZone.classList.add("hidden");
		previewContainer.classList.remove("hidden");

		const fileSizeKb = (fileSize / 1024).toFixed(1);
		const firstIndi = parsed.individuals[0];
		const probandName = firstIndi ? firstIndi.primaryName.fullName : "Не визначено";

		previewContainer.innerHTML = `
			<div class="gedcom-preview-card" style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
				<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
					<h4 style="margin: 0; font-size: 16px; color: var(--color-text-main); display: flex; align-items: center; gap: 8px;">
						<i class="ri-file-code-line" style="color: var(--color-primary);"></i> ${fileName} (${fileSizeKb} КБ)
					</h4>
					<button class="btn btn-sm btn-outline js-reset-file" style="padding: 2px 8px; font-size: 12px;">Змінити файл</button>
				</div>
				<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 12px;">
					<div class="preview-stat-pill" style="background: var(--color-bg-body); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--color-border);">
						<div style="font-size: 11px; color: var(--color-text-muted);">Програма-джерело</div>
						<div style="font-weight: 600; font-size: 14px; color: var(--color-text-main);">${parsed.header.source || "GEDCOM"}</div>
					</div>
					<div class="preview-stat-pill" style="background: var(--color-bg-body); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--color-border);">
						<div style="font-size: 11px; color: var(--color-text-muted);">Версія стандарту</div>
						<div style="font-weight: 600; font-size: 14px; color: var(--color-text-main);">${parsed.header.gedcomVersion || "5.5.1"}</div>
					</div>
					<div class="preview-stat-pill" style="background: var(--color-bg-body); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--color-border);">
						<div style="font-size: 11px; color: var(--color-text-muted);">Осіб у файлі</div>
						<div style="font-weight: 600; font-size: 14px; color: var(--color-primary);">${parsed.stats.individualsCount.toLocaleString()}</div>
					</div>
					<div class="preview-stat-pill" style="background: var(--color-bg-body); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--color-border);">
						<div style="font-size: 11px; color: var(--color-text-muted);">Сімей</div>
						<div style="font-weight: 600; font-size: 14px; color: var(--color-primary);">${parsed.stats.familiesCount.toLocaleString()}</div>
					</div>
				</div>
				<div style="font-size: 13px; color: var(--color-text-main); background: var(--color-bg-body); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--color-border);">
					<strong>Перша особа (пробанд):</strong> ${probandName}
				</div>
			</div>

			<div style="margin-bottom: 16px;">
				<label style="font-size: 13px; font-weight: 600; color: var(--color-text-main); margin-bottom: 8px; display: block;">Стратегія конвертації:</label>
				<div style="display: flex; gap: 12px; flex-wrap: wrap;">
					<label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; color: var(--color-text-main);">
						<input type="radio" name="gedcom-strategy" value="replace" checked /> Створити нову чисту базу
					</label>
					<label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; color: var(--color-text-main);">
						<input type="radio" name="gedcom-strategy" value="merge" /> Об'єднати з наявною базою
					</label>
				</div>
			</div>

			<div id="gedcom-conversion-result" class="hidden"></div>

			<button id="btn-do-gedcom-convert" class="btn btn-primary w-full" style="padding: 10px; font-size: 14px; font-weight: 600; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;">
				<i class="ri-refresh-line"></i> Сконвертувати в таблиці Geneo
			</button>
		`;

		const btnReset = previewContainer.querySelector(".js-reset-file");
		if (btnReset) {
			btnReset.addEventListener("click", () => {
				previewContainer.classList.add("hidden");
				if (dropZone) dropZone.classList.remove("hidden");
				this.currentParsedGedcom = null;
			});
		}

		const btnConvert = previewContainer.querySelector("#btn-do-gedcom-convert");
		if (btnConvert) {
			btnConvert.addEventListener("click", () => this._executeConversion());
		}
	}

	_executeConversion() {
		if (!this.currentParsedGedcom) return;

		const strategyInput = this.overlay?.querySelector('input[name="gedcom-strategy"]:checked');
		const strategy = strategyInput ? strategyInput.value : "replace";

		const btnConvert = this.overlay?.querySelector("#btn-do-gedcom-convert");
		const resultDiv = this.overlay?.querySelector("#gedcom-conversion-result");

		if (btnConvert) {
			btnConvert.disabled = true;
			btnConvert.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Конвертація об'єктів...`;
		}

		setTimeout(() => {
			try {
				const db = this.engine?.db || {};
				const converted = convertGedcomToGeneo(this.currentParsedGedcom, db, { strategy });

				if (btnConvert) btnConvert.style.display = "none";
				if (resultDiv) {
					resultDiv.classList.remove("hidden");
					resultDiv.innerHTML = `
						<div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
							<h4 style="margin: 0 0 8px 0; color: #16a34a; font-size: 15px; display: flex; align-items: center; gap: 6px;">
								<i class="ri-checkbox-circle-line"></i> Успішно сконвертовано!
							</h4>
							<ul style="margin: 0; padding-left: 18px; font-size: 13px; color: var(--color-text-main); line-height: 1.6;">
								<li>Осіб: <strong>${converted.stats.personsCount}</strong> (basic.csv, names.csv)</li>
								<li>Сімей: <strong>${converted.stats.familiesCount}</strong> (families.csv, familyChildren.csv)</li>
								<li>Подій: <strong>${converted.stats.birthEvents}</strong> народжень, <strong>${converted.stats.deathEvents}</strong> смертей, <strong>${converted.stats.marriageEvents}</strong> шлюбів</li>
								<li>Населених пунктів: <strong>${converted.stats.placesCount}</strong> (places.csv)</li>
							</ul>
						</div>
						<div style="display: flex; gap: 8px;">
							<button id="btn-download-converted-csv" class="btn btn-outline w-full" style="padding: 8px; font-size: 13px; border-radius: 8px; cursor: pointer;">
								<i class="ri-file-download-line"></i> Завантажити таблиці CSV
							</button>
						</div>
					`;

					const btnDl = resultDiv.querySelector("#btn-download-converted-csv");
					if (btnDl && typeof Papa !== "undefined") {
						btnDl.addEventListener("click", () => {
							// Завантажуємо families.csv
							const famCsv = Papa.unparse(converted.families);
							const blob = new Blob([famCsv], { type: "text/csv;charset=utf-8" });
							const url = URL.createObjectURL(blob);
							const a = document.createElement("a");
							a.href = url;
							a.download = "families_converted.csv";
							a.click();
							URL.revokeObjectURL(url);
						});
					}
				}
			} catch (e) {
				console.error("Помилка конвертації:", e);
				alert("Помилка під час конвертації: " + e.message);
				if (btnConvert) {
					btnConvert.disabled = false;
					btnConvert.innerHTML = `<i class="ri-refresh-line"></i> Спробувати знову`;
				}
			}
		}, 100);
	}
}
