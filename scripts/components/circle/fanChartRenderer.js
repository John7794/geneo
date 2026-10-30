// ./scripts/components/circle/fanChartRenderer.js

import { escapeHtml, convertDriveLink } from "../../utils/helpers.js";

/**
 * Конфігурація геометрії кола
 */
export const FAN_CONFIG = {
	cx: 500,
	cy: 500,
	viewBoxSize: 1000,
	rProband: 85,
	// Радіуси для кожного покоління (0..7)
	ringRadii: [
		{ in: 0, out: 85 },     // Gen 0 (Пробанд)
		{ in: 85, out: 145 },   // Gen 1 (Батьки: ширина 60)
		{ in: 145, out: 205 },  // Gen 2 (Дідусі: ширина 60)
		{ in: 205, out: 265 },  // Gen 3 (Прадідусі: ширина 60)
		{ in: 265, out: 320 },  // Gen 4 (Пра(2)дідусі: ширина 55)
		{ in: 320, out: 370 },  // Gen 5 (Пра(3)дідусі: ширина 50)
		{ in: 370, out: 415 },  // Gen 6 (Пра(4)дідусі: ширина 45)
		{ in: 415, out: 455 },  // Gen 7 (Пра(5)дідусі: ширина 40)
	],
};

/**
 * Перетворює градуси в радіани
 */
function toRad(deg) {
	return (deg * Math.PI) / 180;
}

/**
 * Генерує шлях SVG для кругового сектора (дуги)
 */
export function buildAnnularPath(cx, cy, rIn, rOut, startAngle, endAngle) {
	const span = Math.abs(endAngle - startAngle);
	const safeEnd = span >= 180 ? startAngle + Math.min(span, 179.999) : endAngle;

	const aRad = toRad(startAngle);
	const bRad = toRad(safeEnd);

	const p1 = { x: cx + rIn * Math.cos(aRad), y: cy + rIn * Math.sin(aRad) };
	const p2 = { x: cx + rOut * Math.cos(aRad), y: cy + rOut * Math.sin(aRad) };
	const p3 = { x: cx + rOut * Math.cos(bRad), y: cy + rOut * Math.sin(bRad) };
	const p4 = { x: cx + rIn * Math.cos(bRad), y: cy + rIn * Math.sin(bRad) };

	const largeArc = span > 180 ? 1 : 0;

	return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} ` +
		`L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} ` +
		`A ${rOut} ${rOut} 0 ${largeArc} 1 ${p3.x.toFixed(2)} ${p3.y.toFixed(2)} ` +
		`L ${p4.x.toFixed(2)} ${p4.y.toFixed(2)} ` +
		`A ${rIn} ${rIn} 0 ${largeArc} 0 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} Z`;
}

/**
 * Генерує дуговий шлях для <textPath> для поколінь 1..3
 * Щоб текст не був догори дриґом у нижній півсфері, змінюємо напрямок
 */
export function buildTextArcPath(cx, cy, r, startAngle, endAngle) {
	const norm = (a) => ((a % 360) + 360) % 360;
	const mid = (startAngle + endAngle) / 2;
	const normMid = norm(mid);

	// Нижня півсфера: від 20° до 160°
	const isBottom = normMid > 20 && normMid < 160;

	const pad = Math.min(Math.abs(endAngle - startAngle) * 0.04, 3);
	const s = startAngle + pad;
	const e = endAngle - pad;

	let pStart, pEnd, sweep;
	if (!isBottom) {
		pStart = { x: cx + r * Math.cos(toRad(s)), y: cy + r * Math.sin(toRad(s)) };
		pEnd = { x: cx + r * Math.cos(toRad(e)), y: cy + r * Math.sin(toRad(e)) };
		sweep = 1;
	} else {
		pStart = { x: cx + r * Math.cos(toRad(e)), y: cy + r * Math.sin(toRad(e)) };
		pEnd = { x: cx + r * Math.cos(toRad(s)), y: cy + r * Math.sin(toRad(s)) };
		sweep = 0;
	}

	const span = Math.abs(e - s);
	const largeArc = span > 180 ? 1 : 0;

	return `M ${pStart.x.toFixed(2)} ${pStart.y.toFixed(2)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 ${largeArc} ${sweep} ${pEnd.x.toFixed(2)} ${pEnd.y.toFixed(2)}`;
}

/**
 * Головний рендерер SVG
 * Повертає повнорозмірний SVG із внутрішнім контейнером <g id="fan-viewport">
 * @param {object} pedigreeData - результат buildPedigreeData
 * @param {object} options
 * @returns {SVGElement}
 */
export function renderFanChartSVG(pedigreeData, options = {}) {
	const { activeGens = null, selectedSosa = null } = options;
	const { cx, cy, ringRadii } = FAN_CONFIG;

	const svgNS = "http://www.w3.org/2000/svg";
	const svg = document.createElementNS(svgNS, "svg");
	svg.setAttribute("width", "100%");
	svg.setAttribute("height", "100%");
	svg.setAttribute("class", "fan-chart-svg");
	svg.setAttribute("id", "fan-chart-svg-root");

	// <defs> для шляхів тексту, обрізки аватара та секторів
	const defs = document.createElementNS(svgNS, "defs");

	// ClipPath для аватара пробанда
	const clipPath = document.createElementNS(svgNS, "clipPath");
	clipPath.setAttribute("id", "fan-avatar-clip");
	const clipCircle = document.createElementNS(svgNS, "circle");
	clipCircle.setAttribute("cx", String(cx));
	clipCircle.setAttribute("cy", String(cy - 22));
	clipCircle.setAttribute("r", "28");
	clipPath.appendChild(clipCircle);
	defs.appendChild(clipPath);

	svg.appendChild(defs);

	// Головний векторний шар масштабування та панорамування
	const viewportGroup = document.createElementNS(svgNS, "g");
	viewportGroup.setAttribute("id", "fan-viewport");
	viewportGroup.setAttribute("class", "fan-viewport");

	// Група кілець предків (покоління 1..max)
	const ringsGroup = document.createElementNS(svgNS, "g");
	ringsGroup.setAttribute("class", "fan-rings-group");

	const generations = pedigreeData.generations || [];

	// Чи всі покоління активні?
	const isAllActive = !activeGens || activeGens.has("all") || activeGens.size === 0;

	// Рендеримо кільця від 1 до N
	for (let gIdx = 1; gIdx < generations.length; gIdx++) {
		const genData = generations[gIdx];
		const gen = genData.generation;
		const rInfo = ringRadii[gen] || ringRadii[ringRadii.length - 1];

		const genGroup = document.createElementNS(svgNS, "g");
		genGroup.setAttribute("class", `fan-generation-group fan-gen-${gen}`);
		genGroup.setAttribute("data-generation", String(gen));

		if (!isAllActive && !activeGens.has(String(gen)) && !activeGens.has(gen)) {
			genGroup.classList.add("fan-gen--dimmed");
		}

		for (let sIdx = 0; sIdx < genData.sectors.length; sIdx++) {
			const sector = genData.sectors[sIdx];
			const sectorGroup = createSectorElement(sector, rInfo, cx, cy, defs, svgNS, selectedSosa);
			genGroup.appendChild(sectorGroup);
		}

		ringsGroup.appendChild(genGroup);
	}

	viewportGroup.appendChild(ringsGroup);

	// Центральне коло пробанда (покоління 0)
	const probandData = generations[0]?.sectors[0];
	if (probandData) {
		const isProbandDimmed = !isAllActive && !activeGens.has("0") && !activeGens.has(0);
		const probandGroup = createProbandElement(probandData, ringRadii[0], cx, cy, svgNS, isProbandDimmed);
		viewportGroup.appendChild(probandGroup);
	}

	svg.appendChild(viewportGroup);

	return svg;
}

/**
 * Створює елемент сектора предка
 */
function createSectorElement(sector, rInfo, cx, cy, defs, svgNS, selectedSosa) {
	const { sosa, generation, side, quadrant, isKnown, isConfirmed, person, angles, hasRecords } = sector;
	const g = document.createElementNS(svgNS, "g");

	const isSelected = selectedSosa === sosa;
	const sectorClass = [
		"fan-sector",
		`fan-sector--gen-${generation}`,
		`fan-sector--${side}`,
		`fan-sector--q${quadrant}`,
		isKnown ? "fan-sector--known" : "fan-sector--unknown",
		isKnown && isConfirmed ? "fan-sector--confirmed" : (isKnown ? "fan-sector--hypothetical" : ""),
		isSelected ? "fan-sector--selected" : "",
	].filter(Boolean).join(" ");

	g.setAttribute("class", sectorClass);
	g.setAttribute("data-sosa", String(sosa));
	g.setAttribute("data-generation", String(generation));
	if (sector.personId) g.setAttribute("data-person-id", String(sector.personId));

	const pathD = buildAnnularPath(cx, cy, rInfo.in, rInfo.out, angles.start, angles.end);

	// 1. SVG Path дуги
	const path = document.createElementNS(svgNS, "path");
	path.setAttribute("d", pathD);
	path.setAttribute("class", "fan-sector-shape");
	g.appendChild(path);

	// 2. Якщо предок невідомий — форма з пунктирним контуром
	if (!isKnown) {
		return g;
	}

	// Створюємо clipPath для сектора, щоб текст гарантовано ніколи не вилазив за межі
	const clipId = `fan-clip-sosa-${sosa}`;
	const clip = document.createElementNS(svgNS, "clipPath");
	clip.setAttribute("id", clipId);
	const clipPathElem = document.createElementNS(svgNS, "path");
	clipPathElem.setAttribute("d", pathD);
	clip.appendChild(clipPathElem);
	defs.appendChild(clip);

	// Група тексту з прив'язкою до clipPath
	const textGroup = document.createElementNS(svgNS, "g");
	textGroup.setAttribute("clip-path", `url(#${clipId})`);
	textGroup.setAttribute("class", "fan-sector-content");

	// 3. Текст: повне ім'я та прізвище (без скорочення до ініціалів!)
	const name = (person?.name || person?.first_name || "").trim();
	const surname = (person?.surname || person?.last_name || "").trim();
	const dates = (person?.dates || person?.lifespan || "").trim();

	const rMid = (rInfo.in + rInfo.out) / 2;
	const radialDepth = rInfo.out - rInfo.in;
	const maxRadialLength = Math.max(radialDepth - 10, 20);

	if (generation <= 3) {
		// Покоління 1..3: дуговий текст через <textPath>
		const pathId = `fan-text-path-${sosa}`;
		const textArcPath = document.createElementNS(svgNS, "path");
		textArcPath.setAttribute("id", pathId);
		textArcPath.setAttribute("d", buildTextArcPath(cx, cy, rMid, angles.start, angles.end));
		textArcPath.setAttribute("class", "fan-text-guide-path");
		defs.appendChild(textArcPath);

		const text = document.createElementNS(svgNS, "text");
		text.setAttribute("class", "fan-sector-text");

		const textPath = document.createElementNS(svgNS, "textPath");
		textPath.setAttribute("href", `#${pathId}`);
		textPath.setAttribute("startOffset", "50%");
		textPath.setAttribute("text-anchor", "middle");

		let fullLabel = "";
		if (surname && name) {
			fullLabel = `${surname} ${name}`;
		} else {
			fullLabel = surname || name;
		}

		const lifeYears = sector.lifeYears || dates;
		if (generation <= 2 && lifeYears) {
			fullLabel += ` (${lifeYears})`;
		}

		textPath.textContent = fullLabel;
		text.appendChild(textPath);
		textGroup.appendChild(text);
	} else if (generation <= 5) {
		// Покоління 4..5: радіальне розміщення у два рядки (Прізвище + Ім'я)
		const midAngle = angles.mid;
		const normAngle = ((midAngle % 360) + 360) % 360;
		const isLeft = normAngle > 90 && normAngle < 270;
		const textRot = isLeft ? normAngle + 180 : normAngle;

		const rad = toRad(midAngle);
		const tx = cx + rMid * Math.cos(rad);
		const ty = cy + rMid * Math.sin(rad);

		const text = document.createElementNS(svgNS, "text");
		text.setAttribute("class", `fan-sector-text fan-sector-text--radial fan-text-gen-${generation}`);
		text.setAttribute("x", String(tx.toFixed(1)));
		text.setAttribute("y", String(ty.toFixed(1)));
		text.setAttribute("text-anchor", "middle");
		text.setAttribute("dominant-baseline", "central");
		text.setAttribute("transform", `rotate(${textRot.toFixed(1)}, ${tx.toFixed(1)}, ${ty.toFixed(1)})`);

		if (surname && name) {
			const tspanSurname = document.createElementNS(svgNS, "tspan");
			tspanSurname.setAttribute("x", String(tx.toFixed(1)));
			tspanSurname.setAttribute("dy", "-0.45em");
			tspanSurname.setAttribute("font-weight", "700");
			tspanSurname.textContent = surname;
			if (surname.length > 9) {
				tspanSurname.setAttribute("textLength", String(maxRadialLength));
				tspanSurname.setAttribute("lengthAdjust", "spacingAndGlyphs");
			}

			const tspanName = document.createElementNS(svgNS, "tspan");
			tspanName.setAttribute("x", String(tx.toFixed(1)));
			tspanName.setAttribute("dy", "1.1em");
			tspanName.setAttribute("font-weight", "500");
			tspanName.textContent = name;
			if (name.length > 9) {
				tspanName.setAttribute("textLength", String(maxRadialLength));
				tspanName.setAttribute("lengthAdjust", "spacingAndGlyphs");
			}

			text.appendChild(tspanSurname);
			text.appendChild(tspanName);
		} else {
			const singleText = surname || name;
			text.textContent = singleText;
			if (singleText.length > 9) {
				text.setAttribute("textLength", String(maxRadialLength));
				text.setAttribute("lengthAdjust", "spacingAndGlyphs");
			}
		}

		textGroup.appendChild(text);
	} else {
		// Покоління 6..7: компактне радіальне розміщення з автоматичним масштабуванням glyphs
		const midAngle = angles.mid;
		const normAngle = ((midAngle % 360) + 360) % 360;
		const isLeft = normAngle > 90 && normAngle < 270;
		const textRot = isLeft ? normAngle + 180 : normAngle;

		const rad = toRad(midAngle);
		const tx = cx + rMid * Math.cos(rad);
		const ty = cy + rMid * Math.sin(rad);

		const text = document.createElementNS(svgNS, "text");
		text.setAttribute("class", `fan-sector-text fan-sector-text--radial fan-text-gen-${generation}`);
		text.setAttribute("x", String(tx.toFixed(1)));
		text.setAttribute("y", String(ty.toFixed(1)));
		text.setAttribute("text-anchor", "middle");
		text.setAttribute("dominant-baseline", "central");
		text.setAttribute("transform", `rotate(${textRot.toFixed(1)}, ${tx.toFixed(1)}, ${ty.toFixed(1)})`);

		const displayName = surname || name;
		text.textContent = displayName;

		// Щоб довгі прізвища ніколи не вилазили за межі кільця
		if (displayName.length > 7) {
			text.setAttribute("textLength", String(maxRadialLength));
			text.setAttribute("lengthAdjust", "spacingAndGlyphs");
		}

		textGroup.appendChild(text);
	}

	g.appendChild(textGroup);

	// 4. Маркер наявності документів/нагород (тільки якщо є архівні записи)
	if (hasRecords) {
		const rad = toRad(angles.mid);
		const dotR = rInfo.out - 4;
		const dotX = cx + dotR * Math.cos(rad);
		const dotY = cy + dotR * Math.sin(rad);

		const dot = document.createElementNS(svgNS, "circle");
		dot.setAttribute("cx", String(dotX.toFixed(1)));
		dot.setAttribute("cy", String(dotY.toFixed(1)));
		dot.setAttribute("r", generation >= 5 ? "2" : "2.8");
		dot.setAttribute("class", "fan-sector-record-dot");
		dot.setAttribute("title", "Є архівні записи");
		g.appendChild(dot);
	}

	return g;
}

/**
 * Створює центральний елемент пробанда (Покоління 0)
 */
function createProbandElement(probandData, rInfo, cx, cy, svgNS, isDimmed) {
	const { person, gender, isConfirmed } = probandData;
	const g = document.createElementNS(svgNS, "g");
	g.setAttribute("class", "fan-proband-group");
	g.setAttribute("data-sosa", "1");
	if (probandData.personId) g.setAttribute("data-person-id", String(probandData.personId));

	if (isDimmed) {
		g.classList.add("fan-gen--dimmed");
	}

	// Фонові кола
	const bgCircle = document.createElementNS(svgNS, "circle");
	bgCircle.setAttribute("cx", String(cx));
	bgCircle.setAttribute("cy", String(cy));
	bgCircle.setAttribute("r", String(rInfo.out));
	bgCircle.setAttribute("class", `fan-proband-circle fan-proband--${gender}`);
	g.appendChild(bgCircle);

	// Аватар або ініціали
	let avatarUrl = person?.photo || person?.avatar;
	if (avatarUrl && String(avatarUrl).includes("google.com")) {
		avatarUrl = convertDriveLink(avatarUrl);
	}
	const hasValidPhoto = avatarUrl &&
		!avatarUrl.includes("placeholder") &&
		!avatarUrl.includes("male.png") &&
		!avatarUrl.includes("female.png") &&
		!avatarUrl.startsWith("data:image/svg+xml");

	if (hasValidPhoto) {
		const img = document.createElementNS(svgNS, "image");
		img.setAttribute("href", avatarUrl);
		img.setAttributeNS("http://www.w3.org/1999/xlink", "href", avatarUrl);
		img.setAttribute("x", String(cx - 28));
		img.setAttribute("y", String(cy - 50));
		img.setAttribute("width", "56");
		img.setAttribute("height", "56");
		img.setAttribute("clip-path", "url(#fan-avatar-clip)");
		img.setAttribute("preserveAspectRatio", "xMidYMid slice");
		g.appendChild(img);
	} else {
		const initCircle = document.createElementNS(svgNS, "circle");
		initCircle.setAttribute("cx", String(cx));
		initCircle.setAttribute("cy", String(cy - 22));
		initCircle.setAttribute("r", "26");
		initCircle.setAttribute("class", "fan-proband-avatar-placeholder");
		g.appendChild(initCircle);

		const initials = document.createElementNS(svgNS, "text");
		initials.setAttribute("x", String(cx));
		initials.setAttribute("y", String(cy - 21));
		initials.setAttribute("text-anchor", "middle");
		initials.setAttribute("dominant-baseline", "central");
		initials.setAttribute("class", "fan-proband-initials");
		const f = (person?.first_name || person?.name || "").charAt(0);
		const l = (person?.last_name || person?.surname || "").charAt(0);
		let initText = "";
		if (f && l) initText = (f + l).toUpperCase();
		else if (f) initText = f.toUpperCase();
		else if (l) initText = l.toUpperCase();
		else initText = "Я";
		initials.textContent = initText;
		g.appendChild(initials);
	}

	// Рамка аватара
	const avatarBorder = document.createElementNS(svgNS, "circle");
	avatarBorder.setAttribute("cx", String(cx));
	avatarBorder.setAttribute("cy", String(cy - 22));
	avatarBorder.setAttribute("r", "27");
	avatarBorder.setAttribute("class", "fan-proband-avatar-border");
	g.appendChild(avatarBorder);

	// ПІБ пробанда
	const nameText = document.createElementNS(svgNS, "text");
	nameText.setAttribute("x", String(cx));
	nameText.setAttribute("y", String(cy + 22));
	nameText.setAttribute("text-anchor", "middle");
	nameText.setAttribute("class", "fan-proband-name");
	const fullName = [person?.first_name || person?.name, person?.last_name || person?.surname].filter(Boolean).join(" ");
	nameText.textContent = fullName || "Пробанд";
	g.appendChild(nameText);

	// Роки життя
	const dates = probandData.lifeYears || person?.dates || person?.lifespan || "";
	if (dates) {
		const datesText = document.createElementNS(svgNS, "text");
		datesText.setAttribute("x", String(cx));
		datesText.setAttribute("y", String(cy + 38));
		datesText.setAttribute("text-anchor", "middle");
		datesText.setAttribute("class", "fan-proband-dates");
		datesText.textContent = dates;
		g.appendChild(datesText);
	}

	// Бейдж спорідненості "Ви (Пробанд)"
	const badgeText = document.createElementNS(svgNS, "text");
	badgeText.setAttribute("x", String(cx));
	badgeText.setAttribute("y", String(cy + 54));
	badgeText.setAttribute("text-anchor", "middle");
	badgeText.setAttribute("class", "fan-proband-badge");
	badgeText.textContent = "Ви (Пробанд)";
	g.appendChild(badgeText);

	return g;
}
