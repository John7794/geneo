// ./scripts/services/gedcom/gedcomParser.js

import { parseGedcomDate } from "./gedcomDateParser.js";
import { parseGedcomName } from "./nameParser.js";

/**
 * Парсер файлів GEDCOM 5.5.1 та 7.0 у структуроване In-Memory дерево (AST).
 * Підтримує UTF-8, автоматичне розгортання CONC/CONT, багаторівневі події та цитування.
 */

function stripAt(idStr) {
	if (!idStr) return "";
	return String(idStr).replace(/^@|@$/g, "").trim();
}

/**
 * Розбиває сирий текст GEDCOM на ієрархічні токени
 */
function tokenizeGedcom(rawText) {
	// Видаляємо BOM (Byte Order Mark), якщо присутній
	const cleanText = rawText.replace(/^\uFEFF/, "");
	const lines = cleanText.split(/\r?\n/);

	const nodes = [];
	let lastNode = null;

	for (let i = 0; i < lines.length; i++) {
		const rawLine = lines[i].trim();
		if (!rawLine) continue;

		// Регулярний вираз для GEDCOM рядка: LEVEL [XREF] TAG [VALUE]
		// Приклад 1: 0 HEAD
		// Приклад 2: 0 @I1@ INDI
		// Приклад 3: 1 NAME Іван /Петренко/
		const match = rawLine.match(/^(\d+)\s+(?:(@[^@]+@)\s+)?([A-Za-z0-9_]+)(?:\s+(.*))?$/);
		if (!match) continue;

		const level = parseInt(match[1], 10);
		const xref = match[2] ? match[2].trim() : "";
		const tag = match[3].toUpperCase();
		const value = match[4] !== undefined ? match[4] : "";

		// Обробка продовження тексту CONC (без пробілу) та CONT (новий рядок)
		if (tag === "CONC" && lastNode) {
			lastNode.value += value;
			continue;
		} else if (tag === "CONT" && lastNode) {
			lastNode.value += "\n" + value;
			continue;
		}

		const node = {
			level,
			xref,
			tag,
			value,
			children: [],
		};

		lastNode = node;
		nodes.push(node);
	}

	// Побудова ієрархічного дерева вузлів за level
	const root = [];
	const stack = []; // stack[level] = node

	for (const node of nodes) {
		const lvl = node.level;
		if (lvl === 0) {
			root.push(node);
			stack[0] = node;
			stack.length = 1;
		} else {
			const parent = stack[lvl - 1];
			if (parent) {
				parent.children.push(node);
			}
			stack[lvl] = node;
			stack.length = lvl + 1;
		}
	}

	return root;
}

/**
 * Допоміжна функція пошуку дочірнього вузла за тегом
 */
function getChildValue(node, tag) {
	const found = node.children.find((c) => c.tag === tag);
	return found ? found.value.trim() : "";
}

function getAllChildren(node, tag) {
	return node.children.filter((c) => c.tag === tag);
}

/**
 * Екстрагує подію (BIRT, DEAT, MARR, BAPM тощо)
 */
function extractEvent(eventNode) {
	if (!eventNode) return null;

	const dateVal = getChildValue(eventNode, "DATE");
	const parsedDate = parseGedcomDate(dateVal);
	const placeVal = getChildValue(eventNode, "PLAC");
	const addrNode = eventNode.children.find((c) => c.tag === "ADDR");
	const address = addrNode ? addrNode.value : "";
	const causeVal = getChildValue(eventNode, "CAUS");

	// Цитування джерел у події
	const sourceCitations = getAllChildren(eventNode, "SOUR").map((s) => ({
		sourceId: stripAt(s.value),
		page: getChildValue(s, "PAGE"),
	}));

	return {
		type: eventNode.tag,
		rawDate: dateVal,
		day: parsedDate.day,
		month: parsedDate.month,
		year: parsedDate.year,
		isOldStyle: parsedDate.isOldStyle,
		dateSort: parsedDate.dateSort,
		dateType: parsedDate.dateType,
		place: placeVal,
		address,
		cause: causeVal,
		sourceCitations,
	};
}

/**
 * Головна функція парсингу тексту GEDCOM
 * 
 * @param {string} gedcomText - Повний сирий вміст файлу .ged
 * @returns {Object} - Структурований об'єкт { header, individuals, families, sources, repositories, stats }
 */
export function parseGedcom(gedcomText) {
	if (!gedcomText || typeof gedcomText !== "string") {
		throw new Error("Invalid GEDCOM input: expected non-empty string.");
	}

	const rootNodes = tokenizeGedcom(gedcomText);

	const header = {
		source: "",
		gedcomVersion: "5.5.1",
		charset: "UTF-8",
		date: "",
	};

	const individuals = [];
	const families = [];
	const sources = [];
	const repositories = [];

	for (const node of rootNodes) {
		const tag = node.tag;
		const id = stripAt(node.xref);

		if (tag === "HEAD") {
			const sourNode = node.children.find((c) => c.tag === "SOUR");
			if (sourNode) header.source = sourNode.value;

			const gedcNode = node.children.find((c) => c.tag === "GEDC");
			if (gedcNode) {
				const vers = getChildValue(gedcNode, "VERS");
				if (vers) header.gedcomVersion = vers;
			}

			const charVal = getChildValue(node, "CHAR");
			if (charVal) header.charset = charVal;

			const dateVal = getChildValue(node, "DATE");
			if (dateVal) header.date = dateVal;
		} else if (tag === "INDI") {
			// 1. Імена (може бути декілька)
			const nameNodes = getAllChildren(node, "NAME");
			const parsedNames = nameNodes.map((nNode) => {
				const subTags = {};
				for (const sc of nNode.children) {
					subTags[sc.tag] = sc.value;
				}
				return parseGedcomName(nNode.value, subTags);
			});

			const primaryName = parsedNames[0] || parseGedcomName("", {});

			// 2. Стать (SEX: M, F, U)
			const rawSex = getChildValue(node, "SEX").toUpperCase();
			const gender = rawSex === "M" ? "M" : rawSex === "F" ? "F" : "U";

			// 3. Базові події
			const birtNode = node.children.find((c) => c.tag === "BIRT");
			const deatNode = node.children.find((c) => c.tag === "DEAT");
			const bapmNode = node.children.find((c) => c.tag === "BAPM" || c.tag === "CHR");
			const buriNode = node.children.find((c) => c.tag === "BURI");

			const birth = extractEvent(birtNode);
			const death = extractEvent(deatNode);
			const baptism = extractEvent(bapmNode);
			const funeral = extractEvent(buriNode);

			// 4. Сімейні зв'язки
			const familiesAsSpouse = getAllChildren(node, "FAMS").map((f) => stripAt(f.value));
			const familiesAsChild = getAllChildren(node, "FAMC").map((f) => {
				const famId = stripAt(f.value);
				const pedi = (getChildValue(f, "PEDI") || "birth").toLowerCase();
				return { familyId: famId, pedigreeType: pedi };
			});

			// 5. Замітки (NOTE) та Джерела (SOUR)
			const notes = getAllChildren(node, "NOTE").map((n) => n.value);
			const sourceIds = getAllChildren(node, "SOUR").map((s) => stripAt(s.value));

			// 6. Інші життєві події (OCCU, EDUC, RESI тощо)
			const otherEvents = node.children
				.filter((c) => ["OCCU", "EDUC", "RESI", "EVEN"].includes(c.tag))
				.map((c) => ({
					tag: c.tag,
					value: c.value,
					...extractEvent(c),
				}));

			individuals.push({
				id: id || `I${individuals.length + 1}`,
				primaryName,
				allNames: parsedNames,
				gender,
				birth,
				death,
				baptism,
				funeral,
				otherEvents,
				familiesAsSpouse,
				familiesAsChild,
				notes,
				sourceIds,
			});
		} else if (tag === "FAM") {
			const husbNode = node.children.find((c) => c.tag === "HUSB");
			const wifeNode = node.children.find((c) => c.tag === "WIFE");
			const childrenNodes = getAllChildren(node, "CHIL");
			const marrNode = node.children.find((c) => c.tag === "MARR");
			const divNode = node.children.find((c) => c.tag === "DIV");

			const husbandId = husbNode ? stripAt(husbNode.value) : "";
			const wifeId = wifeNode ? stripAt(wifeNode.value) : "";
			const children = childrenNodes.map((c, idx) => ({
				childId: stripAt(c.value),
				order: idx + 1,
				pedigreeType: "birth",
			}));

			const marriage = extractEvent(marrNode);
			const divorce = extractEvent(divNode);

			const notes = getAllChildren(node, "NOTE").map((n) => n.value);
			const sourceIds = getAllChildren(node, "SOUR").map((s) => stripAt(s.value));

			families.push({
				id: id || `F${families.length + 1}`,
				husbandId,
				wifeId,
				children,
				marriage,
				divorce,
				notes,
				sourceIds,
			});
		} else if (tag === "SOUR") {
			const title = getChildValue(node, "TITL");
			const author = getChildValue(node, "AUTH");
			const publication = getChildValue(node, "PUBL");
			const repoNode = node.children.find((c) => c.tag === "REPO");
			const repoId = repoNode ? stripAt(repoNode.value) : "";

			sources.push({
				id: id || `S${sources.length + 1}`,
				title,
				author,
				publication,
				repoId,
			});
		} else if (tag === "REPO") {
			const name = getChildValue(node, "NAME");
			const addr = getChildValue(node, "ADDR");

			repositories.push({
				id: id || `R${repositories.length + 1}`,
				name,
				address: addr,
			});
		}
	}

	return {
		header,
		individuals,
		families,
		sources,
		repositories,
		stats: {
			individualsCount: individuals.length,
			familiesCount: families.length,
			sourcesCount: sources.length,
			repositoriesCount: repositories.length,
		},
	};
}
