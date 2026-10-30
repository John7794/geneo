// ./scripts/components/circle/fanChartRenderer.js

import { escapeHtml } from "../../utils/helpers.js";

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
		{ in: 265, out: 320 },  // Gen 4 (Пра²дідусі: ширина 55)
		{ in: 320, out: 370 },  // Gen 5 (Пра³дідусі: ширина 50)
		{ in: 370, out: 415 },  // Gen 6 (Пра⁴дідусі: ширина 45)
		{ in: 415, out: 455 },  // Gen 7 (Пра⁵дідусі: ширина 40)
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
	// Запобігаємо зливанню точок при рівно 180° чи 360°
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

	// Зменшуємо дугу на невеликий відступ, щоб текст не наїжджав на краї
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
 * @param {object} pedigreeData - результат buildPedigreeData
 * @param {object} options
 * @returns {SVGElement}
 */
export function renderFanChartSVG(pedigreeData, options = {}) {
	const { activeGen = null, selectedSosa = null } = options;
	const { cx, cy, viewBoxSize, ringRadii } = FAN_CONFIG;

	const svgNS = "http://www.w3.org/2000/svg";
	const svg = document.createElementNS(svgNS, "svg");
	svg.setAttribute("viewBox", `0 0 ${viewBoxSize} ${viewBoxSize}`);
	svg.setAttribute("class", "fan-chart-svg");
	svg.setAttribute("id", "fan-chart-svg-root");

	// <defs> для шляхів тексту та обрізки фото
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

	// Група кілець предків (покоління 1..max)
	const ringsGroup = document.createElementNS(svgNS, "g");
	ringsGroup.setAttribute("class", "fan-rings-group");

	const generations = pedigreeData.generations || [];

	// Рендеримо кільця від 1 до N
	for (let gIdx = 1; gIdx < generations.length; gIdx++) {
		const genData = generations[gIdx];
		const gen = genData.generation;
		const rInfo = ringRadii[gen] || ringRadii[ringRadii.length - 1];

		const genGroup = document.createElementNS(svgNS, "g");
		genGroup.setAttribute("class", `fan-generation-group fan-gen-${gen}`);
		genGroup.setAttribute("data-generation", String(gen));

		if (activeGen !== null && activeGen !== "all" && Number(activeGen) !== gen) {
			genGroup.classList.add("fan-gen--dimmed");
		}

		for (let sIdx = 0; sIdx < genData.sectors.length; sIdx++) {
			const sector = genData.sectors[sIdx];
			const sectorGroup = createSectorElement(sector, rInfo, cx, cy, defs, svgNS, selectedSosa);
			genGroup.appendChild(sectorGroup);
		}

		ringsGroup.appendChild(genGroup);
	}

	svg.appendChild(ringsGroup);

	// Центральне коло пробанда (покоління 0)
	const probandData = generations[0]?.sectors[0];
	if (probandData) {
		const probandGroup = createProbandElement(probandData, ringRadii[0], cx, cy, svgNS, activeGen);
		svg.appendChild(probandGroup);
	}

	return svg;
}

/**
 * Створює елемент сектора предка
 */
function createSectorElement(sector, rInfo, cx, cy, defs, svgNS, selectedSosa) {
	const { sosa, generation, side, quadrant, isKnown, person, angles, hasRecords } = sector;
	const g = document.createElementNS(svgNS, "g");

	const isSelected = selectedSosa === sosa;
	const sectorClass = [
		"fan-sector",
		`fan-sector--gen-${generation}`,
		`fan-sector--${side}`,
		`fan-sector--q${quadrant}`,
		isKnown ? "fan-sector--known" : "fan-sector--unknown",
		isSelected ? "fan-sector--selected" : "",
	].filter(Boolean).join(" ");

	g.setAttribute("class", sectorClass);
	g.setAttribute("data-sosa", String(sosa));
	g.setAttribute("data-generation", String(generation));
	if (sector.personId) g.setAttribute("data-person-id", String(sector.personId));

	// 1. SVG Path дуги
	const path = document.createElementNS(svgNS, "path");
	path.setAttribute("d", buildAnnularPath(cx, cy, rInfo.in, rInfo.out, angles.start, angles.end));
	path.setAttribute("class", "fan-sector-shape");
	g.appendChild(path);

	// 2. Якщо предок невідомий — просто повертаємо форму з контуром
	if (!isKnown) {
		return g;
	}

	// 3. Текст: для поколінь 1..3 використовуємо дуговий <textPath>, для 4+ радіальний поворот
	const name = person?.name || person?.first_name || "";
	const surname = person?.surname || person?.last_name || "";
	const dates = person?.dates || person?.lifespan || "";

	if (generation <= 3) {
		// Текстовий дуговий шлях
		const rMid = (rInfo.in + rInfo.out) / 2;
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

		// Форматування тексту
		let label = "";
		if (generation === 1) {
			label = `${name} ${surname}`;
			if (dates) label += ` • ${dates}`;
		} else if (generation === 2) {
			label = `${surname} ${name}`;
			if (dates) label += ` (${dates})`;
		} else {
			// Gen 3
			label = surname ? `${surname} ${name.charAt(0)}.` : name;
		}

		textPath.textContent = label;
		text.appendChild(textPath);
		g.appendChild(text);
	} else {
		// Покоління 4..7: радіальний розворот тексту
		const midAngle = angles.mid;
		const normAngle = ((midAngle % 360) + 360) % 360;
		const isLeft = normAngle > 90 && normAngle < 270;

		const textRot = isLeft ? normAngle + 180 : normAngle;
		const rPos = isLeft ? rInfo.out - 6 : rInfo.in + 6;
		const textAnchor = isLeft ? "end" : "start";

		const rad = toRad(midAngle);
		const tx = cx + rPos * Math.cos(rad);
		const ty = cy + rPos * Math.sin(rad);

		const text = document.createElementNS(svgNS, "text");
		text.setAttribute("class", `fan-sector-text fan-sector-text--radial fan-text-gen-${generation}`);
		text.setAttribute("x", String(tx.toFixed(1)));
		text.setAttribute("y", String(ty.toFixed(1)));
		text.setAttribute("text-anchor", textAnchor);
		text.setAttribute("dominant-baseline", "central");
		text.setAttribute("transform", `rotate(${textRot.toFixed(1)}, ${tx.toFixed(1)}, ${ty.toFixed(1)})`);

		// Лаконічне ім'я
		let displayName = surname || name;
		if (surname && name && generation <= 5) {
			displayName = `${surname} ${name.charAt(0)}.`;
		}

		text.textContent = displayName;
		g.appendChild(text);
	}

	// 4. Маркер наявності документів/нагород (делікатна крапка на зовнішній кромці)
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
function createProbandElement(probandData, rInfo, cx, cy, svgNS, activeGen) {
	const { person, gender, hasRecords } = probandData;
	const g = document.createElementNS(svgNS, "g");
	g.setAttribute("class", "fan-proband-group");
	g.setAttribute("data-sosa", "1");
	if (probandData.personId) g.setAttribute("data-person-id", String(probandData.personId));

	if (activeGen !== null && activeGen !== "all" && Number(activeGen) !== 0) {
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
	const avatarUrl = person?.photo || person?.avatar;
	if (avatarUrl && !avatarUrl.includes("placeholder")) {
		const img = document.createElementNS(svgNS, "image");
		img.setAttribute("href", avatarUrl);
		img.setAttribute("x", String(cx - 28));
		img.setAttribute("y", String(cy - 50));
		img.setAttribute("width", "56");
		img.setAttribute("height", "56");
		img.setAttribute("clip-path", "url(#fan-avatar-clip)");
		img.setAttribute("preserveAspectRatio", "xMidYMid slice");
		g.appendChild(img);
	} else {
		// Іконка/ініціали
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
		initials.textContent = (f + l).toUpperCase() || "Я";
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
	const dates = person?.dates || person?.lifespan || "";
	if (dates) {
		const datesText = document.createElementNS(svgNS, "text");
		datesText.setAttribute("x", String(cx));
		datesText.setAttribute("y", String(cy + 38));
		datesText.setAttribute("text-anchor", "middle");
		datesText.setAttribute("class", "fan-proband-dates");
		datesText.textContent = dates;
		g.appendChild(datesText);
	}

	// Бейдж спорідненості "Ви"
	const badgeText = document.createElementNS(svgNS, "text");
	badgeText.setAttribute("x", String(cx));
	badgeText.setAttribute("y", String(cy + 54));
	badgeText.setAttribute("text-anchor", "middle");
	badgeText.setAttribute("class", "fan-proband-badge");
	badgeText.textContent = "Ви (Пробанд)";
	g.appendChild(badgeText);

	return g;
}
