// ./scripts/components/circle/fanChartRenderer.js

import { escapeHtml, convertDriveLink } from "../../utils/helpers.js";

/**
 * Конфігурація геометрії кола
 */
export const FAN_CONFIG = {
	cx: 550,
	cy: 550,
	viewBoxSize: 1100,
	rProband: 75,
	// Радіуси для кожного покоління (0..6)
	ringRadii: [
		{ in: 0, out: 75 },     // Gen 0 (Ви / Пробанд: r=75, d=150)
		{ in: 75, out: 145 },   // Gen 1 (Батьки: ширина 70)
		{ in: 145, out: 215 },  // Gen 2 (Дідусі: ширина 70)
		{ in: 215, out: 285 },  // Gen 3 (Прадідусі: ширина 70)
		{ in: 285, out: 360 },  // Gen 4 (Пра(2)дідусі: ширина 75)
		{ in: 360, out: 440 },  // Gen 5 (Пра(3)дідусі: ширина 80)
		{ in: 440, out: 525 },  // Gen 6 (Пра(4)дідусі: ширина 85)
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
	if (span >= 359.9) {
		// Повне кільце (360°) — огортає пробанда
		return `M ${cx} ${cy - rOut} ` +
			`A ${rOut} ${rOut} 0 1 1 ${cx} ${cy + rOut} ` +
			`A ${rOut} ${rOut} 0 1 1 ${cx} ${cy - rOut} ` +
			`M ${cx} ${cy - rIn} ` +
			`A ${rIn} ${rIn} 0 1 0 ${cx} ${cy + rIn} ` +
			`A ${rIn} ${rIn} 0 1 0 ${cx} ${cy - rIn} Z`;
	}

	const aRad = toRad(startAngle);
	const bRad = toRad(endAngle);

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
	const span = Math.abs(endAngle - startAngle);
	if (span >= 359.9) {
		// Повне кільце (360°) — розміщуємо текст по верхній дузі (210° -> 330°)
		const pStart = { x: cx + r * Math.cos(toRad(210)), y: cy + r * Math.sin(toRad(210)) };
		const pEnd = { x: cx + r * Math.cos(toRad(330)), y: cy + r * Math.sin(toRad(330)) };
		return `M ${pStart.x.toFixed(2)} ${pStart.y.toFixed(2)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${pEnd.x.toFixed(2)} ${pEnd.y.toFixed(2)}`;
	}

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
	clipCircle.setAttribute("cy", String(cy - 20));
	clipCircle.setAttribute("r", "25");
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

	// Бейджі ідентифікації рівнів поколінь вздовж верхнього вертикального розділювача
	const levelLabels = {
		1: "Батьки",
		2: "Діди",
		3: "Прадіди",
		4: "Пра(2)діди",
		5: "Пра(3)діди",
		6: "Пра(4)діди",
	};

	const levelPillsGroup = document.createElementNS(svgNS, "g");
	levelPillsGroup.setAttribute("class", "fan-level-pills-group");

	for (let gen = 1; gen < Math.min(generations.length, ringRadii.length); gen++) {
		const rInfo = ringRadii[gen];
		const genData = generations[gen];
		if (!rInfo) continue;

		let labelText = genData?.label || levelLabels[gen];
		if (!labelText) continue;
		if (labelText.includes("Дідо (по татові)")) labelText = "Дід (Т)";
		else if (labelText.includes("Баба (по татові)")) labelText = "Баба (Т)";
		else if (labelText.includes("Дідо (по мамі)")) labelText = "Дід (М)";
		else if (labelText.includes("Баба (по мамі)")) labelText = "Баба (М)";
		else if (labelText.includes("Дідусі (по татові)")) labelText = "Діди (Т)";
		else if (labelText.includes("Дідусі (по мамі)")) labelText = "Діди (М)";

		const rMid = (rInfo.in + rInfo.out) / 2;
		const pillY = cy - rMid;

		const pillG = document.createElementNS(svgNS, "g");
		pillG.setAttribute("class", "fan-level-pill");
		pillG.setAttribute("transform", `translate(${cx}, ${pillY.toFixed(1)})`);

		const pillW = labelText.length > 7 ? 68 : (labelText.length > 5 ? 56 : 46);
		const pillH = 17;

		const rect = document.createElementNS(svgNS, "rect");
		rect.setAttribute("x", String(-pillW / 2));
		rect.setAttribute("y", String(-pillH / 2));
		rect.setAttribute("width", String(pillW));
		rect.setAttribute("height", String(pillH));
		rect.setAttribute("rx", String(pillH / 2));
		rect.setAttribute("ry", String(pillH / 2));
		rect.setAttribute("class", "fan-level-pill-bg");

		const text = document.createElementNS(svgNS, "text");
		text.setAttribute("x", "0");
		text.setAttribute("y", "0");
		text.setAttribute("text-anchor", "middle");
		text.setAttribute("dominant-baseline", "central");
		text.setAttribute("class", "fan-level-pill-text");
		text.textContent = labelText;

		pillG.appendChild(rect);
		pillG.appendChild(text);
		levelPillsGroup.appendChild(pillG);
	}

	viewportGroup.appendChild(levelPillsGroup);

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

		textPath.textContent = fullLabel;
		text.appendChild(textPath);
		textGroup.appendChild(text);
	} else {
		// Покоління 4..6: природне радіальне розміщення без деформації шрифтів
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
			tspanSurname.setAttribute("font-weight", "600");
			tspanSurname.textContent = surname;

			const tspanName = document.createElementNS(svgNS, "tspan");
			tspanName.setAttribute("x", String(tx.toFixed(1)));
			tspanName.setAttribute("dy", "1.1em");
			tspanName.setAttribute("font-weight", "600");
			tspanName.textContent = name;

			text.appendChild(tspanSurname);
			text.appendChild(tspanName);
		} else {
			text.textContent = surname || name;
		}

		textGroup.appendChild(text);
	}

	g.appendChild(textGroup);

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
		img.setAttribute("x", String(cx - 25));
		img.setAttribute("y", String(cy - 45));
		img.setAttribute("width", "50");
		img.setAttribute("height", "50");
		img.setAttribute("clip-path", "url(#fan-avatar-clip)");
		img.setAttribute("preserveAspectRatio", "xMidYMid slice");
		g.appendChild(img);
	} else {
		const initCircle = document.createElementNS(svgNS, "circle");
		initCircle.setAttribute("cx", String(cx));
		initCircle.setAttribute("cy", String(cy - 20));
		initCircle.setAttribute("r", "25");
		initCircle.setAttribute("class", "fan-proband-avatar-placeholder");
		g.appendChild(initCircle);

		const initials = document.createElementNS(svgNS, "text");
		initials.setAttribute("x", String(cx));
		initials.setAttribute("y", String(cy - 19));
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
	avatarBorder.setAttribute("cy", String(cy - 20));
	avatarBorder.setAttribute("r", "26");
	avatarBorder.setAttribute("class", "fan-proband-avatar-border");
	g.appendChild(avatarBorder);

	// ПІБ пробанда (лише ім'я та прізвище, без дат)
	const nameText = document.createElementNS(svgNS, "text");
	nameText.setAttribute("x", String(cx));
	nameText.setAttribute("y", String(cy + 22));
	nameText.setAttribute("text-anchor", "middle");
	nameText.setAttribute("class", "fan-proband-name");
	const fullName = [person?.first_name || person?.name, person?.last_name || person?.surname].filter(Boolean).join(" ");
	nameText.textContent = fullName || "Пробанд";
	g.appendChild(nameText);

	// Бейдж спорідненості "Ви (Пробанд)"
	const badgeText = document.createElementNS(svgNS, "text");
	badgeText.setAttribute("x", String(cx));
	badgeText.setAttribute("y", String(cy + 40));
	badgeText.setAttribute("text-anchor", "middle");
	badgeText.setAttribute("class", "fan-proband-badge");
	badgeText.textContent = "Ви (Пробанд)";
	g.appendChild(badgeText);

	return g;
}
