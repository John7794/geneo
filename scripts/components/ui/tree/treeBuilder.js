// ./scripts/components/ui/tree/treeBuilder.js

import { i18n } from "../../../core/i18n.js";
import { UI_CLASSES } from "../../../core/uiClasses.js";
import { isFemale } from "../../../utils/genderUtils.js";
import { getAvatarUrl } from "../../../utils/personUtils.js";
import {
	clearTreeCache,
	getCachedPersonDetails,
	getMappedParents,
	getCachedDates,
} from "../../../utils/treeUtils.js";

const cardCache = new Map();

const escapeHTML = (str) =>
	String(str || "").replace(
		/[&<>'"]/g,
		(tag) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
				tag
			] || tag,
	);

function renderUnknownCard() {
	const label = escapeHTML(i18n.t("common.unknown") || "Невідомо");
	return `
		<div class="${UI_CLASSES.treeNode} ${UI_CLASSES.treeNodeUnknown}">
			<div class="${UI_CLASSES.treeNodeInner}">
				<div class="${UI_CLASSES.treeNodePhotoBox} ${UI_CLASSES.treeNodePhotoBoxUnknown}">
					<span class="${UI_CLASSES.treeNodePlaceholderIcon}">?</span>
				</div>
				<div class="${UI_CLASSES.treeNodeName} ${UI_CLASSES.treeNodeNameUnknown}">${label}</div>
			</div>
		</div>
	`;
}

export function renderCardHTML(
	rawPersonOrId,
	id,
	context,
	type = "direct",
	isRoot = false,
) {
	const rawPassedId =
		id ||
		(typeof rawPersonOrId === "object"
			? rawPersonOrId.personId || rawPersonOrId.id
			: rawPersonOrId);
	const rawId = String(rawPassedId || "").trim();
	const cleanId = rawId.includes("::") ? rawId.split("::").pop() : rawId;

	const cacheKey = `${cleanId}_${type}_${isRoot}`;
	if (cardCache.has(cacheKey)) return cardCache.get(cacheKey);

	const bllPerson = getCachedPersonDetails(cleanId, context);

	const person =
		typeof rawPersonOrId === "object" && bllPerson
			? { ...bllPerson, ...rawPersonOrId }
			: bllPerson || rawPersonOrId;

	if (!person || person.source === "unknown") {
		const result = cleanId
			? renderUnknownCard()
			: `<div class="${UI_CLASSES.treeNode} ${UI_CLASSES.treeNodeHidden}"></div>`;
		cardCache.set(cacheKey, result);
		return result;
	}

	const safeId = escapeHTML(person.id || person.fam_id || cleanId);
	const name = person.name || person.fam_first_name || person.firstName || "";
	const surname = person.surname || person.fam_surname || "";
	const fullName = escapeHTML(
		(surname ? `${name} ${surname.toUpperCase()}` : name).trim(),
	);

	// 🔥 Строга верифікація статусу. Відсутність маркера = пунктир
	const rawStatus =
		person.status !== undefined ? person.status : person.fam_status;
	const safeStatus = String(
		rawStatus !== undefined && rawStatus !== null ? rawStatus : "hypothetical",
	)
		.trim()
		.toLowerCase();

	const isConfirmed =
		safeStatus === "1" ||
		safeStatus === "confirmed" ||
		safeStatus === "true" ||
		safeStatus === "так" ||
		safeStatus === "+";

	const statusClass = !isConfirmed ? UI_CLASSES.treeNodeHypothetical : "";

	const DB = context.db || {};
	let cachedB = "";
	let cachedD = "";

	if (typeof getCachedDates === "function") {
		const dates = getCachedDates(safeId, DB);
		if (dates) {
			cachedB = dates.bYear || "";
			cachedD = dates.dYear || "";
		}
	}

	const extractYear = (dateStr) => {
		if (!dateStr) return "";
		const match = String(dateStr).match(/\b(1[56789]\d{2}|20\d{2})\b/);
		return match ? match[0] : String(dateStr).trim();
	};

	const actualBYear =
		cachedB ||
		person.birth_year ||
		extractYear(person.birthDate || person.fam_birth_date);
	const actualDYear =
		cachedD ||
		person.death_year ||
		extractYear(person.deathDate || person.fam_death_date);

	let isAlive =
		person.isAlive !== undefined
			? person.isAlive
			: !actualDYear || actualDYear === "?";
	const vStatus =
		person.vitalStatus !== undefined ? person.vitalStatus : person.vital_status;

	if (
		vStatus !== undefined &&
		vStatus !== null &&
		String(vStatus).trim() !== ""
	) {
		const v = String(vStatus).trim().toLowerCase();
		if (v === "1" || v === "true" || v === "+") isAlive = true;
		if (v === "0" || v === "false" || v === "-") isAlive = false;
	}

	let lifeYears = "";
	if (isAlive) {
		if (actualBYear) lifeYears = `* ${actualBYear}`;
	} else {
		if (actualBYear || actualDYear) {
			lifeYears = `${actualBYear || "?"} – ${actualDYear || "?"}`;
		}
	}

	if (!lifeYears && person.lifeYears) {
		lifeYears = person.lifeYears;
	}

	const safeLifeYears = escapeHTML(lifeYears);

	const isFem = isFemale(person.gender || person.fam_gender);
	const genderClass = isFem
		? UI_CLASSES.treeNodeFemale
		: UI_CLASSES.treeNodeMale;
	const photoSrc = escapeHTML(
		getAvatarUrl(person.photo || person.fam_photo || person.id, isFem),
	);
	const fallbackSrc = escapeHTML(getAvatarUrl(null, isFem));

	const imgHtml = `<img src="${photoSrc}" class="${UI_CLASSES.treeNodePhoto}" alt="${fullName}" loading="lazy" onerror="this.onerror=null; this.src='${fallbackSrc}';">`;

	let buttonHtml = "";
	if (type === "direct" && person.hasProfile !== false) {
		const viewProfileLabel = escapeHTML(
			i18n.t("ui.viewProfile") || "Перейти до профілю",
		);
		const searchIcon = escapeHTML(
			UI_CLASSES.icons?.userSearch || "ri-user-search-line",
		);
		buttonHtml = `
			<button class="${UI_CLASSES.btnGotoProfile} ${UI_CLASSES.jsGoProfile}" title="${viewProfileLabel}" data-profile-id="${safeId}">
				<i class="${searchIcon}" aria-hidden="true"></i>
			</button>
		`;
	}

	const rootData = isRoot ? 'data-root="true"' : "";

	const htmlOutput = `
		<div class="${UI_CLASSES.treeNode} ${statusClass} ${genderClass}" data-id="${safeId}" ${rootData}>
			${buttonHtml}
			<div class="${UI_CLASSES.treeNodeInner}">
				 <div class="${UI_CLASSES.treeNodePhotoBox}">${imgHtml}</div>
				 <div class="${UI_CLASSES.treeNodeName}" title="${fullName}">${fullName}</div>
				 <div class="${UI_CLASSES.treeNodeDates}">${safeLifeYears}</div>
			</div>
		</div>
	`;

	cardCache.set(cacheKey, htmlOutput);
	return htmlOutput;
}

function buildRecursiveTreeHTML(
	personId,
	context,
	currentDepth,
	maxDepth,
	allowedIds = null,
	isRoot = false,
) {
	const cleanId = String(personId).trim();
	const person = getCachedPersonDetails(cleanId, context);

	if (!person || person.source === "unknown") {
		return `<li>${renderUnknownCard()}</li>`;
	}

	const realId = person.id;
	let cardHTML = renderCardHTML(person, realId, context, "direct", isRoot);

	if (currentDepth >= maxDepth) {
		return `<li>${cardHTML}</li>`;
	}

	const { fatherId, motherId } = getMappedParents(realId, context);
	const childrenBuffer = [];

	if (fatherId) {
		if (!allowedIds || allowedIds.includes(String(fatherId))) {
			childrenBuffer.push(
				buildRecursiveTreeHTML(
					fatherId,
					context,
					currentDepth + 1,
					maxDepth,
					allowedIds,
					false,
				),
			);
		}
	} else {
		childrenBuffer.push(`<li>${renderUnknownCard()}</li>`);
	}

	if (motherId) {
		if (!allowedIds || allowedIds.includes(String(motherId))) {
			childrenBuffer.push(
				buildRecursiveTreeHTML(
					motherId,
					context,
					currentDepth + 1,
					maxDepth,
					allowedIds,
					false,
				),
			);
		}
	} else {
		childrenBuffer.push(`<li>${renderUnknownCard()}</li>`);
	}

	if (childrenBuffer.length > 0) {
		return `<li>${cardHTML}<ul>${childrenBuffer.join("")}</ul></li>`;
	}

	return `<li>${cardHTML}</li>`;
}

export function buildGenerationHTML(
	rootId,
	context,
	maxGen = 5,
	allowedIds = null,
) {
	if (!rootId) return "";

	clearTreeCache();
	cardCache.clear();

	if (context) {
		context._currentBuildRootId = String(rootId);
	}

	return buildRecursiveTreeHTML(rootId, context, 1, maxGen, allowedIds, true);
}
