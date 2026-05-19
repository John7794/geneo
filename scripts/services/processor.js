// ./scripts/services/processor.js

import { COLUMNS } from "../core/dbSchema.js";
import { findPersonDetails, resolveRealId } from "../utils/personUtils.js";
import {
	enrich,
	parseKinshipIds,
	getParticipants,
	processRecords,
	ensureIndexes,
} from "../utils/profileUtils.js";
import { createValueGetter } from "../utils/helpers.js";
import { SpiritualIndexer } from "./spiritualIndexer.js";
import {
	hydrateRecordsTable,
	parseHumanFormat,
} from "../utils/processorUtils.js";
import { resolveLocation } from "../utils/geoUtils.js";
import { isMale } from "../utils/genderUtils.js";
import { mergeMultipageRecords } from "../utils/recordUtils.js";

export function buildPersonObject(queryId, allData) {
	const DB = allData?.db || {};

	if (!DB.basic && !DB.familyList) {
		return { id: queryId, _isMissing: true };
	}

	if (DB.records && !DB.records._isHydrated) {
		DB.records = hydrateRecordsTable(DB.records);
	}

	ensureIndexes(allData);

	if (!allData._spiritualIndex) {
		allData._spiritualIndex = new SpiritualIndexer().build(DB);
	}

	const targetId = resolveRealId(queryId, allData);

	const findInIndex = (indexName, id) => {
		const indexMap = allData._indexes?.[indexName];
		if (!indexMap) return [];
		const result = indexMap.get(String(id));
		return Array.isArray(result) ? result : result ? [result] : [];
	};

	const findInMap = (mapName, id) => {
		const res = allData._indexes?.[mapName]?.get(String(id));
		return Array.isArray(res) ? res[0] : res;
	};

	const basicRow = findInMap("basic", targetId);
	const famRow = !basicRow ? findInMap("family", targetId) : null;

	if (!basicRow && !famRow) {
		return { id: targetId, _isMissing: true };
	}

	const getVal = createValueGetter(basicRow, famRow);
	const rawData = basicRow || famRow || {};
	const namesRow = findInMap("names", targetId);
	const safeKinship = allData.kinship?.[String(targetId)] || {};

	const liteContext = { ...DB, engine: allData };

	const engineParents =
		typeof allData.getParents === "function"
			? allData.getParents(targetId)
			: [];
	const engineChildren =
		typeof allData.getChildren === "function"
			? allData.getChildren(targetId)
			: [];
	const engineSpouses =
		typeof allData.getSpouses === "function"
			? allData.getSpouses(targetId)
			: [];

	const engineSiblings =
		typeof allData.getSiblingsDetailed === "function"
			? allData.getSiblingsDetailed(targetId)
			: { full: [], half_p: [], half_m: [], step: [] };

	const engineGP =
		typeof allData.getGrandparents === "function"
			? allData.getGrandparents(targetId)
			: { paternal: [], maternal: [] };

	let safeMarriages = safeKinship.m_map || [];

	if (
		safeMarriages.length === 0 &&
		(engineSpouses.length > 0 || engineChildren.length > 0)
	) {
		if (engineSpouses.length > 0) {
			safeMarriages = engineSpouses.map((spId) => {
				const sharedChildren = engineChildren.filter((childId) => {
					const cParents =
						typeof allData.getParents === "function"
							? allData.getParents(childId)
							: [];
					return cParents.includes(String(spId));
				});
				return {
					spouseId: spId,
					children: { bio: sharedChildren },
				};
			});
		} else if (engineChildren.length > 0) {
			safeMarriages = [{ spouseId: null, children: { bio: engineChildren } }];
		}
	}

	const rawSpiritual = allData._spiritualIndex.getSpiritualData(targetId);
	const spiritualEnriched = rawSpiritual
		? {
				godparents: enrich(
					rawSpiritual.godparents,
					liteContext,
					() => "godparent",
				),
				godchildren: enrich(
					rawSpiritual.godchildren,
					liteContext,
					() => "godchild",
				),
				cogodparents: enrich(
					rawSpiritual.cogodparents,
					liteContext,
					() => "cogodparent",
				),
			}
		: null;

	const rawRecordsForPerson = processRecords(DB.records, targetId, DB);
	const enrichedRecords = mergeMultipageRecords(rawRecordsForPerson);

	return {
		id: targetId,
		name:
			getVal(
				COLUMNS.basic?.name || "name",
				COLUMNS.familyList?.firstName || "first_name",
			) || getVal(COLUMNS.basic?.name || "name", COLUMNS.basic?.name || "name"),
		surname: getVal(
			COLUMNS.basic?.surname || "surname",
			COLUMNS.familyList?.surname || "surname",
		),
		patronymic: getVal(
			COLUMNS.basic?.patronymic || "patronymic",
			COLUMNS.familyList?.patronymic || "patronymic",
		),
		gender: getVal(
			COLUMNS.basic?.gender || "gender",
			COLUMNS.familyList?.gender || "gender",
		),
		photo: getVal(
			COLUMNS.basic?.photo || "photo",
			COLUMNS.familyList?.photo || "photo",
		),
		slug: basicRow ? basicRow[COLUMNS.basic?.slug || "slug"] : "",
		bioUrl: getVal(
			COLUMNS.basic?.bioUrl || "bioUrl",
			COLUMNS.familyList?.bioUrl || "bio_url",
		),
		hasProfile: true,
		_engine: allData,
		status: basicRow
			? basicRow.status !== undefined
				? basicRow.status
				: basicRow[COLUMNS.basic?.status || "status"]
			: "",
		vitalStatus: basicRow
			? basicRow.vital_status !== undefined
				? basicRow.vital_status
				: basicRow[COLUMNS.basic?.vitalStatus || "vitalStatus"]
			: "",

		birthDate: getVal(
			COLUMNS.basic?.birthDate || "birthDate",
			COLUMNS.familyList?.birthDate || "birthDate",
		),
		deathDate: getVal(
			COLUMNS.basic?.deathDate || "deathDate",
			COLUMNS.familyList?.deathDate || "deathDate",
		),

		title: namesRow
			? namesRow[COLUMNS.names?.title || "title"]
			: rawData[COLUMNS.familyList?.title || "title"] || "",
		maidenName: namesRow ? namesRow[COLUMNS.names?.bSurname || "bSurname"] : "",
		coatOfArms: namesRow
			? namesRow[COLUMNS.names?.bCoat || "bCoat"]
			: rawData[COLUMNS.familyList?.coatOfArms || "coatOfArms"] || "",
		origin: rawData[COLUMNS.familyList?.origin || "origin"] || "",

		_basic: basicRow,
		_names: namesRow,
		_context: liteContext,
		_records: enrichedRecords,

		_spiritual: spiritualEnriched,

		_family: {
			_raw: safeKinship,
			ancestors: safeKinship.anc || "",

			parents: {
				bio: enrich(
					safeKinship.p?.bio
						? parseKinshipIds(safeKinship.p.bio)
						: engineParents,
					liteContext,
					(p) => (isMale(p.gender) ? "father" : "mother"),
				),
				step: enrich(
					[
						...parseKinshipIds(safeKinship.p?.st?.f),
						...parseKinshipIds(safeKinship.p?.st?.m),
					],
					liteContext,
					(p) => (isMale(p.gender) ? "stepFather" : "stepMother"),
				),
				adopted: enrich(parseKinshipIds(safeKinship.p?.ad), liteContext, (p) =>
					isMale(p.gender) ? "adoptedFather" : "adoptedMother",
				),
			},

			grandparents: {
				paternal: enrich(
					safeKinship.gp?.f
						? parseKinshipIds(safeKinship.gp.f)
						: engineGP.paternal,
					liteContext,
					(p) => (isMale(p.gender) ? "grandfather" : "grandmother"),
				),
				maternal: enrich(
					safeKinship.gp?.m
						? parseKinshipIds(safeKinship.gp.m)
						: engineGP.maternal,
					liteContext,
					(p) => (isMale(p.gender) ? "grandfather" : "grandmother"),
				),
			},

			siblings: {
				full: enrich(
					safeKinship.sb?.full
						? parseKinshipIds(safeKinship.sb.full)
						: engineSiblings.full,
					liteContext,
					(p) => (isMale(p.gender) ? "brother" : "sister"),
				),
				half_p: enrich(
					safeKinship.sb?.half_p
						? parseKinshipIds(safeKinship.sb.half_p)
						: engineSiblings.half_p,
					liteContext,
					(p) => (isMale(p.gender) ? "halfBrotherP" : "halfSisterP"),
				),
				half_m: enrich(
					safeKinship.sb?.half_m
						? parseKinshipIds(safeKinship.sb.half_m)
						: engineSiblings.half_m,
					liteContext,
					(p) => (isMale(p.gender) ? "halfBrotherM" : "halfSisterM"),
				),
				step: enrich(
					safeKinship.sb?.step
						? parseKinshipIds(safeKinship.sb.step)
						: engineSiblings.step,
					liteContext,
					(p) => (isMale(p.gender) ? "stepBrother" : "stepSister"),
				),
			},

			relatives: (safeKinship.rel || []).map((lvl) => ({
				level: lvl.level,
				pat: enrich(parseKinshipIds(lvl.pat), liteContext, (p) =>
					isMale(p.gender) ? "maleRelative" : "femaleRelative",
				),
				mat: enrich(parseKinshipIds(lvl.mat), liteContext, (p) =>
					isMale(p.gender) ? "maleRelative" : "femaleRelative",
				),
			})),

			marriage: safeMarriages.map((m) => ({
				spouse: m.spouseId ? findPersonDetails(m.spouseId, liteContext) : null,
				children: {
					bio: enrich(
						m.children?.bio
							? parseKinshipIds(m.children.bio)
							: m.children?.bio || [],
						liteContext,
						(p) => (isMale(p.gender) ? "son" : "daughter"),
					),
					step: m.children?.step
						? enrich(parseKinshipIds(m.children.step), liteContext, (p) =>
								isMale(p.gender) ? "stepSon" : "stepDaughter",
							)
						: [],
					adopted: m.children?.adopted
						? enrich(parseKinshipIds(m.children.adopted), liteContext, (p) =>
								isMale(p.gender) ? "adoptedSon" : "adoptedDaughter",
							)
						: [],
				},
			})),

			grandChildrenMap: Object.keys(safeKinship.gc_map || {}).reduce(
				(acc, childId) => {
					acc[childId] = enrich(
						parseKinshipIds(safeKinship.gc_map[childId]),
						liteContext,
						(p) => (isMale(p.gender) ? "grandSon" : "grandDaughter"),
					);
					return acc;
				},
				{},
			),

			spouses: enrich(engineSpouses, liteContext, (p) =>
				isMale(p.gender) ? "husband" : "wife",
			),
		},

		_birth: findInIndex("birth", targetId).map((b) => ({
			...b,
			_participants: getParticipants(
				b[COLUMNS.birth?.id || "id"],
				"birth",
				allData,
				liteContext,
			),
		})),
		_baptism: findInIndex("baptism", targetId).map((b) => ({
			...b,
			_participants: getParticipants(
				b[COLUMNS.baptism?.id || "id"],
				"baptism",
				allData,
				liteContext,
			),
		})),

		_marriage: findInIndex("marriage", targetId)
			.slice()
			.sort(
				(a, b) =>
					(parseInt(a[COLUMNS.marriage?.year || "year"]) || 0) -
					(parseInt(b[COLUMNS.marriage?.year || "year"]) || 0),
			)
			.map((m) => {
				const eventId = m[COLUMNS.marriage?.id || "id"];
				const p1Col = COLUMNS.marriage?.personId || "person_1";
				const p2Col = COLUMNS.marriage?.spouseId || "person_2";

				// 🔥 ДИНАМІЧНА ІДЕНТИФІКАЦІЯ ПАРТНЕРА.
				// Перешкоджає помилці, коли головна особа профілю поверталася як власний партнер
				const partnerId =
					String(m[p1Col]).trim() === String(targetId).trim()
						? m[p2Col]
						: m[p1Col];

				return {
					...m,
					_partner: partnerId
						? findPersonDetails(partnerId, liteContext)
						: null,
					_participants: getParticipants(
						eventId,
						"marriage",
						allData,
						liteContext,
					),
				};
			}),

		_death: findInIndex("death", targetId).map((d) => ({
			...d,
			_participants: getParticipants(
				d[COLUMNS.death?.id || "id"],
				"death",
				allData,
				liteContext,
			),
		})),
		_funeral: findInIndex("funeral", targetId).map((f) => ({
			...f,
			_participants: getParticipants(
				f[COLUMNS.funeral?.id || "id"],
				"funeral",
				allData,
				liteContext,
			),
		})),

		_education: findInIndex("education", targetId).map((e) => ({
			level: e[COLUMNS.education?.level || "level"],
			institution: e[COLUMNS.education?.institution || "institution"],
			institutionLink:
				e[COLUMNS.education?.institutionLink || "institution_link"],
			department: e[COLUMNS.education?.department || "department"],
			direction: e[COLUMNS.education?.direction || "direction"],
			qualification: e[COLUMNS.education?.qualification || "qualification"],
			degree: e[COLUMNS.education?.degree || "degree"],
			address: resolveLocation(e[COLUMNS.education?.address || "address"], DB),
			period: e[COLUMNS.education?.period || "period"] || "",
			form: e[COLUMNS.education?.form || "form"],
			document: e[COLUMNS.education?.document || "document"],
		})),

		_job: findInIndex("job", targetId).map((j) => ({
			company: j[COLUMNS.job?.company || "company"],
			position: j[COLUMNS.job?.position || "position"],
			period: j[COLUMNS.job?.period || "period"] || "",
			form: j[COLUMNS.job?.form || "form"],
			companyLink: j[COLUMNS.job?.companyLink || "company_link"],
			facility: j[COLUMNS.job?.facility || "facility"],
			address: j[COLUMNS.job?.address || "address"],
			settlement: resolveLocation(
				j[COLUMNS.job?.settlement || "settlement"],
				DB,
			),
			region: resolveLocation(j[COLUMNS.job?.region || "region"], DB),
			document: j[COLUMNS.job?.document || "document"],
		})),

		_awards: findInIndex("awards", targetId).map((a) => ({
			date: a[COLUMNS.awards?.date || "date"],
			icon: a[COLUMNS.awards?.icon || "icon"],
			title: a[COLUMNS.awards?.title || "title"],
		})),

		_military: findInIndex("military", targetId).map((m) => {
			const titles = String(
				m[COLUMNS.military?.recordTitle || "record_title"] || "",
			)
				.split(/[,;]/)
				.map((s) => s.trim())
				.filter(Boolean);
			const records = String(m[COLUMNS.military?.record || "record"] || "")
				.split(/[,;]/)
				.map((s) => s.trim())
				.filter(Boolean);
			const urls = String(m[COLUMNS.military?.recordUrl || "record_url"] || "")
				.split(/[,;]/)
				.map((s) => s.trim())
				.filter(Boolean);

			let figuresArray = [];
			const maxLen = Math.max(titles.length, records.length, urls.length);

			for (let i = 0; i < maxLen; i++) {
				if (records[i] || titles[i] || urls[i]) {
					figuresArray.push({
						description: titles[i] ? [titles[i]] : [],
						src: records[i] || "",
						href: urls[i] || "",
					});
				}
			}

			const archId = m[COLUMNS.military?.archiveId || "archive_id"];
			const archRef = m[COLUMNS.military?.archiveRef || "archive_ref"];
			const depoStr = [archId, archRef].filter(Boolean).join(" / ");

			return {
				type: m[COLUMNS.military?.type || "type"],
				affiliation: m[COLUMNS.military?.affiliation || "affiliation"],
				branch: m[COLUMNS.military?.branch || "branch"],
				rank: m[COLUMNS.military?.rank || "rank"],
				position: m[COLUMNS.military?.position || "position"],
				place: resolveLocation(m[COLUMNS.military?.place || "place"], DB),
				period: m[COLUMNS.military?.period || "period"],
				participation: m[COLUMNS.military?.participation || "participation"],
				depo: depoStr,
				figure: figuresArray.length > 0 ? figuresArray : null,
				desc: parseHumanFormat(m[COLUMNS.military?.desc || "desc"], "simple"),
			};
		}),

		_gallery: findInIndex("gallery", targetId).map((g) => ({
			album: g[COLUMNS.gallery?.album || "album"],
			src: g[COLUMNS.gallery?.src || "src"],
			subtitle: g[COLUMNS.gallery?.subtitle || "subtitle"],
		})),

		_domicile: findInIndex("domicile", targetId).map((d) => ({
			type: d[COLUMNS.domicile?.type || "type"],
			period: d[COLUMNS.domicile?.period || "period"],
			region: resolveLocation(d[COLUMNS.domicile?.region || "region"], DB),
			settlement: resolveLocation(
				d[COLUMNS.domicile?.settlement || "settlement"],
				DB,
			),
			address: d[COLUMNS.domicile?.address || "address"],
		})),

		_identity: (() => {
			const row = findInIndex("identity", targetId)[0];
			if (!row) return null;

			return {
				estate: row[COLUMNS.identity?.estate || "estate"],
				belief: row[COLUMNS.identity?.belief || "belief"],
				citizenship: parseHumanFormat(
					row[COLUMNS.identity?.citizenship || "citizenship"],
					"citizenship",
				),
				nationality: parseHumanFormat(
					row[COLUMNS.identity?.nationality || "nationality"],
					"nationality",
				),
				languages: parseHumanFormat(
					row[COLUMNS.identity?.languages || "languages"],
					"languages",
				),
			};
		})(),

		_personal: (() => {
			const row = findInIndex("personal", targetId)[0];
			if (!row) return null;

			return {
				appearance: parseHumanFormat(
					row[COLUMNS.personal?.appearance || "appearance"],
					"appearance",
				),
				temperament: parseHumanFormat(
					row[COLUMNS.personal?.temperament || "temperament"],
					"simple",
				),
				lifestyle: parseHumanFormat(
					row[COLUMNS.personal?.lifestyle || "lifestyle"],
					"simple",
				),
				hobby: parseHumanFormat(
					row[COLUMNS.personal?.hobby || "hobby"],
					"simple",
				),
				pets: parseHumanFormat(row[COLUMNS.personal?.pets || "pets"], "pets"),
				activity: parseHumanFormat(
					row[COLUMNS.personal?.activity || "activity"],
					"simple",
				),
				lifePeriod: row[COLUMNS.personal?.lifePeriod || "life_period"],
				property: row[COLUMNS.personal?.property || "property"],
			};
		})(),
	};
}
