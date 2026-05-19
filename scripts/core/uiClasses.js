// ./scripts/core/uiClasses.js

export const UI_CLASSES = {
	// =====================================================================
	// 1. ГЛОБАЛЬНІ УТИЛІТИ ТА СТАНИ (styles/utilities.css, styles/states.css)
	// =====================================================================
	appWrapper: "app-wrapper",
	profileLayout: "profile-layout",
	hidden: "hidden",
	active: "active",
	show: "show",
	open: "open",
	collapsed: "collapsed",
	isCollapsed: "is-collapsed",
	isDisabled: "is-disabled",
	isDraggable: "is-draggable",
	isDragging: "is-dragging",
	noScroll: "no-scroll",
	selected: "selected",
	jsStopPropagation: "js-stop-propagation",
	fwBold: "fw-bold",
	fwNormal: "fw-normal",
	dBlock: "d-block",
	w100: "w-100",
	flexBetween: "flex-between",
	clickable: "clickable",
	linkText: "link-text",
	textMuted: "text-muted",
	textMeta: "text-meta",
	stickyTitle: "sticky-title",
	orderFirst: "order-first",
	externalLinkIcon: "external-link-icon",
	spacerM: "spacer-m",
	spacerTopS: "spacer-top-s",
	spacerBottomL: "spacer-bottom-l",

	// =====================================================================
	// 2. БАЗОВІ UI КОМПОНЕНТИ (styles/components/...)
	// =====================================================================

	// --- Кнопки (buttons.css) ---
	btn: "btn",
	btnPrimary: "btn-primary",
	btnIcon: "btn-icon",
	btnOpenTree: "btn-open-tree",

	// --- Дати (date.js -> date.css) ---
	dateFormatMain: "date-format-main",
	dateFormatLabel: "date-format-label",
	dateFormatSub: "date-format-sub",

	// --- Географія (geo.js -> location.css) ---
	geoContainer: "geo-container",
	placeMainTitle: "place-main-title",
	placeUnitRow: "place-unit-row",
	placeName: "place-name",
	placeCurrent: "place-current",
	placeHierarchy: "place-hierarchy",
	placeHierarchyContainer: "place-hierarchy-container",
	locationContainer: "location-container",
	locationAddress: "location-address",
	locationAddressSpaced: "location-address--spaced",
	flagIcon: "flag-icon",

	// --- Герби (coat.js -> coat.css) ---
	coatContainer: "coat-container",
	coatIcon: "coat-icon",

	// =====================================================================
	// 3. UI: ПРОФІЛЬ (components/ui/profile/...)
	// =====================================================================

	// --- Шапка профілю (basic.js -> profile-header.css) ---
	themeFemale: "theme-female",
	themeMale: "theme-male",
	profileHeaderPlaceholder: "profile-header-placeholder",
	profileHeader: "profile-header",
	profileCover: "profile-cover",
	profileIdChip: "profile-id-chip",
	profileHeaderContent: "profile-header-content",
	profileAvatar: "profile-avatar",
	avatar: "avatar",
	avatarXl: "avatar--xl",
	profileInfo: "profile-info",
	profileName: "profile-name",
	profileMeta: "profile-meta",
	profileActionBtn: "profile-action-btn",

	// --- Загальні блоки профілю (index.js -> profile-blocks.css) ---
	profileBlock: "profile-block",
	profileBlockHeader: "profile-block__header",
	profileBlockBody: "profile-block__body",
	profileBlockBodySpaced: "profile-block__body--spaced",
	blockDivider: "block-divider",
	blockDividerCompact: "block-divider--compact",
	blockDividerSubsection: "block-divider--subsection",
	blockDividerRelatives: "block-divider--relatives",
	dataRow: "data-row",
	dataRowMeta: "data-row__meta",
	dataRowIcon: "data-row__icon",
	dataRowKey: "data-row__key",
	dataRowValue: "data-row__value",
	dataRowValueBlock: "data-row__value--block",

	// --- Діти, нащадки (children.js, grandchildren.js -> descendants.css) ---
	descendantsCategory: "descendants-category",
	descendantsColumns: "descendants-columns",
	descendantsColumn: "descendants-column",
	descendantsColumnHeader: "descendants-column__header",
	descendantsColumnFull: "descendants-column--full",
	descendantsColumnsStacked: "descendants-columns--stacked",

	// --- Батьки, предки, брати/сестри (parents.js, siblings.js -> ancestors.css) ---
	parentGroup: "parent-group",
	ancestorsRow: "ancestors-row",
	ancestorsRowNoMargin: "ancestors-row--no-margin",
	ancestorBranch: "ancestor-branch",
	ancestorBranchList: "ancestor-branch__list",
	siblingGroup: "sibling-group",

	// --- Шлюби (marriage.js -> marriage.css) ---
	marriageWitnesses: "marriage-witnesses",

	// --- Далекі родичі (relatives.js -> relatives.css) ---
	subsection: "subsection",
	subsectionHeader: "subsection-header",
	subsectionHeaderMuted: "subsection__header--muted",
	relativesSide: "relatives-side",
	relativesSideContent: "relatives-side__content",

	// --- Учасники подій (shared/participants.js -> participants.css) ---
	participantList: "participant-list",
	participantItem: "participant-item",
	participantName: "participant-name",
	participantDetails: "participant-details",

	// --- Записи та Архів (records.js -> records.css) ---
	recordsContainer: "records-container",
	recordsGroup: "records-group",
	recordsGroupTitle: "records-group__title",
	recordsGrid: "records-grid",
	recordCard: "record-card",
	recordCardRole: "record-card__role",
	recordCardPlaceholder: "record-card__placeholder",
	recordCardBadge: "record-card__badge",
	recordCardCover: "record-card__cover",
	recordCardOverlay: "record-card__overlay",
	recordCardContent: "record-card__content",
	recordCardTitle: "record-card__title",
	recordCardTags: "record-card__tags",
	recordTag: "record-tag",
	recordTagInactive: "record-tag--inactive",
	recordCardArchive: "record-card__archive",
	archiveIcon: "archive-icon",
	archiveName: "archive-name",

	// =====================================================================
	// 4. UI: СПОРІДНЕНІСТЬ (components/ui/shared/kinship.js -> kinship-card.css)
	// =====================================================================
	kinshipGrid: "kinship-grid",
	kinshipGrid5Cols: "kinship-grid--5-cols",
	kinshipCol: "kinship-col",
	kinshipCard: "kinship-card",
	kinshipCardPlaceholder: "kinship-card--placeholder",
	kinshipCardPerson: "kinship-card--person",
	kinshipCardMedia: "kinship-card__media",
	kinshipCardImg: "kinship-card__img",
	kinshipCardInfo: "kinship-card__info",
	kinshipCardAffinity: "kinship-card__affinity",
	kinshipCardRole: "kinship-card__role",
	kinshipCardRoleLabel: "kinship-card__role-label",
	kinshipCardName: "kinship-card__name",
	kinshipCardActions: "kinship-card__actions",
	kinshipCardNamePart: "kinship-card__name-part",
	kinshipCardNameInline: "kinship-card__name-inline",
	kinshipCardNameSurname: "kinship-card__name-surname",
	kinshipCardNameFirst: "kinship-card__name-first",
	avatarPlaceholder: "avatar-placeholder",
	statusBadge: "status-badge",
	statusUnknown: "status-unknown",
	statusModifiers: {
		0: "status-badge--hypothetical",
		1: "status-badge--confirmed",
	},
	years: "years",
	familyLinkItem: "family-link-item",
	unlinkedPerson: "unlinked-person",
	unlinkedPersonIcon: "unlinked-person__icon",
	parentGroupSection: "parent-group-section",
	parentGroupHeader: "parent-group-header",
	parentHeaderLine: "parent-header-line",
	parentHeaderText: "parent-header-text",
	parentGroupGrid: "parent-group-grid",
	parentTileWrapper: "parent-tile-wrapper",
	parentTileEmpty: "parent-tile-empty",

	// JS-хуки для карток (js-hooks.css або в utilities)
	btnGotoProfile: "btn-goto-profile",
	jsGoProfile: "js-go-profile",
	jsOpenPersonPopup: "js-open-person-popup",
	jsClosePopup: "js-close-popup",
	jsGoRelationship: "js-go-relationship",

	// =====================================================================
	// 5. ДЕРЕВО РОДУ (components/tree/treeBuilder.js -> tree.css)
	// =====================================================================
	treeContainer: "tree-container",
	treeNode: "tree-node",
	treeNodeUnknown: "tree-node--unknown",
	treeNodeHidden: "tree-node--hidden",
	treeNodeHypothetical: "tree-node--hypothetical",
	treeNodeFemale: "tree-node--female",
	treeNodeMale: "tree-node--male",
	treeNodeInner: "tree-node__inner",
	treeNodePhotoBox: "tree-node__photo-box",
	treeNodePhotoBoxUnknown: "tree-node__photo-box--unknown",
	treeNodePlaceholderIcon: "tree-node__placeholder-icon",
	treeNodePhoto: "tree-node__photo",
	treeNodeName: "tree-node__name",
	treeNodeNameUnknown: "tree-node__name--unknown",
	treeNodeDates: "tree-node__dates",

	// =====================================================================
	// 6. МЕНЕДЖЕРИ ВЗАЄМОДІЇ (components/interaction/...)
	// =====================================================================

	// --- Порівняння зв'язків (relationshipManager.js -> relationship.css) ---
	relationshipMode: "relationship-mode",
	hiddenRelNav: "hidden-rel-nav",
	homeBtn: "home-btn",
	genealogyTree: "genealogy-tree",
	relTreeWrapper: "rel-tree-wrapper",
	relNavControls: "rel-nav-controls",
	btnRelArrow: "btn-rel-arrow",
	relNavInfo: "rel-nav-info",
	relLevelRoot: "rel-level-root",
	relCoupleContainer: "rel-couple-container",
	isCouple: "is-couple",
	relNodeWrapper: "rel-node-wrapper",
	relLineDown: "rel-line-down",
	dashedLine: "dashed-line",
	relBranchBridge: "rel-branch-bridge",
	relBranchConnector: "rel-branch-connector",
	relBranchSingle: "rel-branch-single",
	relStack: "rel-stack",
	relNodePlaceholder: "rel-node-placeholder",
	nodeIndirect: "node-indirect",
	nodeDimmed: "node-dimmed",
	nodeNoClick: "node-no-click",
	noHover: "no-hover",
	hypothetical: "hypothetical",
	relFooterUnified: "rel-footer-unified",
	relFooterCol: "rel-footer-col",
	relFooterColLeft: "rel-footer-col--left",
	relFooterColRight: "rel-footer-col--right",
	relFooterSep: "rel-footer-sep",
	relRow: "rel-row",
	relRowHighlight: "rel-row--highlight",
	relLbl: "rel-lbl",
	relVal: "rel-val",

	// 🔥 НОВІ КЛАСИ ДЛЯ СХЛОПУВАННЯ
	relInvisibleNode: "rel-invisible-node",
	relMergeBracket: "rel-merge-bracket",
	relMergeLeft: "rel-merge-left",
	relMergeRight: "rel-merge-right",
	relColPadded: "rel-col-padded",

	// --- Зум (zoomManager.js -> zoom.css) ---
	zoomControls: "zoom-controls",

	// --- Хлібні крихти (breadcrumbManager.js -> breadcrumbs.css) ---
	breadcrumbsWrapper: "breadcrumbs-wrapper",
	breadcrumbsDropdownMenu: "breadcrumbs__dropdown-menu",
	breadcrumbsDropdownTrigger: "breadcrumbs__dropdown-trigger",
	breadcrumbsDropdownItem: "breadcrumbs__dropdown-item",
	dropdownTriggerIndex: "dropdown-trigger__index",
	dropdownTriggerIcon: "dropdown-trigger__icon",
	breadcrumbsItemWrapper: "breadcrumbs__item-wrapper",
	breadcrumbsLink: "breadcrumbs__link",
	breadcrumbsLinkActive: "breadcrumbs__link--active",
	breadcrumbItem: "breadcrumb-item",
	breadcrumbsSeparator: "breadcrumbs__separator",

	// --- Пошук (searchManager.js -> search.css) ---
	searchItem: "search-item",
	searchAvatar: "search-avatar",
	searchInfo: "search-info",
	searchName: "search-name",
	searchMeta: "search-meta",

	// --- Галерея (galleryManager.js -> gallery.css) ---
	galleryOverlay: "gallery-overlay",
	galleryTopBar: "gallery-top-bar",
	galleryCounter: "gallery-counter",
	galleryDivider: "gallery-divider",
	galleryTopTitle: "gallery-top-title",
	galleryBtn: "gallery-btn",
	galleryPrev: "gallery-prev",
	galleryNext: "gallery-next",
	galleryClose: "gallery-close",
	galleryContent: "gallery-content",
	galleryImageWrapper: "gallery-image-wrapper",
	galleryInfoPanel: "gallery-info-panel",
	galToggleBtn: "gal-toggle-btn",
	galleryScrollContent: "gallery-scroll-content",
	galleryArchive: "gallery-archive",
	galleryDetails: "gallery-details",
	galArchiveActive: "gal-archive--active",
	galArchiveTitle: "gal-archive__title",
	galArchiveRef: "gal-archive__ref",
	galArchiveAddress: "gal-archive__address",
	galTranscription: "gal-transcription",
	btnText: "btn-text",
	arrowIcon: "arrow-icon",
	link: "gal-link",
	metaData: "meta-data",
	metaTranscription: "meta-transcription",
	metaLink: "meta-link",

	// --- Події (eventsManager.js -> events.css) ---
	badgeDot: "badge-dot",
	asLink: "as-link",
	eventPersonLink: "event-person-link",
	eventDateOldStyle: "event-date--old-style",
	eventCard: "event-card",
	eventYears: "event-years",
	eventIconBirth: "event-icon--birth",
	eventIconDeath: "event-icon--death",
	eventIconMarriage: "event-icon--marriage",
	eventHeader: "event-header",
	eventHeaderInfo: "event-header__info",
	eventHeaderTitle: "event-header__title",
	eventHeaderDate: "event-header__date",
	eventNames: "event-names",
	eventNamesAnd: "event-names__and",

	// --- Попап персони (personPopupManager.js -> popup.css) ---
	popupOverlay: "popup-overlay",
	popupContainer: "popup-container",
	modalClose: "modal-close",
	popupClosePos: "popup-close-pos",
	popupHeader: "popup-header",
	popupContent: "popup-content",
	popupFooter: "popup-footer",
	popupRoleBadge: "popup-role-badge",
	popupNoble: "popup-noble",
	popupPhoto: "popup-photo",
	popupName: "popup-name",
	popupDates: "popup-dates",
	popupRow: "popup-row",
	popupValue: "popup-value",
	popupLabel: "popup-label",
	popupSectionTitle: "popup-section-title",
	popupBody: "popup-body",

	// --- Онбординг та довідка (onboardingManager.js -> onboarding.css) ---
	onboardingOverlay: "onboarding-overlay",
	onboardingHighlight: "onboarding-highlight",
	onboardingTooltip: "onboarding-tooltip",
	onboardingTooltipCenter: "onboarding-tooltip--center",
	onboardingHeader: "onboarding-header",
	onboardingTitle: "onboarding-title",
	onboardingStepCounter: "onboarding-step-counter",
	onboardingBody: "onboarding-body",
	onboardingFooter: "onboarding-footer",
	btnTourSkip: "btn-tour-skip",
	btnTourNext: "btn-tour-next",
	btnRestartTour: "btn-restart-tour",
	helpOverlay: "help-overlay",
	helpModal: "help-modal",
	helpHeader: "help-header",
	helpClose: "help-close",
	helpContent: "help-content",
	helpSection: "help-section",
	helpLegendGrid: "help-legend-grid",
	helpItem: "help-item",
	helpIcon: "help-icon",
	helpList: "help-list",
	helpFooter: "help-footer",

	// --- Фільтр родоводу (lineageManager.js -> lineage.css) ---
	lineageOption: "lineage-option",
	lineageTileAvatar: "lineage-tile-avatar",
	lineageTileInfo: "lineage-tile-info",
	lineageTileRole: "lineage-tile-role",
	lineageTileName: "lineage-tile-name",

	// =====================================================================
	// 7. СЛОВНИК ІКОНОК (REMIX ICONS)
	// =====================================================================
	icons: {
		user: "ri-user-line",
		archive: "ri-bank-line",
		birth: "ri-parent-line",
		christening: "ri-drop-line",
		marriage: "ri-heart-line",
		death: "ri-skull-line",
		funeral: "ri-admin-line",
		defaultEvent: "ri-file-text-line",
		tree: "ri-git-branch-line",
		zoomIn: "ri-zoom-in-line",
		userSearch: "ri-user-search-line",
		arrowDownSFill: "ri-arrow-down-s-fill",
		arrowRightSLine: "ri-arrow-right-s-line",
		cake: "ri-cake-2-line",
		candle: "ri-candle-line",
		hearts: "ri-hearts-line",
		arrowLeftSLine: "ri-arrow-left-s-line",
		closeLine: "ri-close-line",
		informationLine: "ri-information-line",
		arrowUpSLine: "ri-arrow-up-s-line",
		folderOpenLine: "ri-folder-open-line",
		mapPinLine: "ri-map-pin-line",
		externalLinkLine: "ri-external-link-line",
		questionMark: "ri-question-mark",
		menLine: "ri-men-line",
		womenLine: "ri-women-line",
		arrowRightLine: "ri-arrow-right-line",
		arrowGoBackLine: "ri-arrow-go-back-line",

		// 🔥 Додано іконки для нових розділів
		bankLine: "ri-bank-line",
		briefcaseLine: "ri-briefcase-line",
		medalLine: "ri-medal-line",
		calendarLine: "ri-calendar-line",
		fileTextLine: "ri-article-line",
	},

	// ==========================================
	// ВКЛАДКА "ОСВІТА" (Education)
	// ==========================================
	educationContainer: "education-container",
	educationGroup: "education-group",
	educationLevelTitle: "education-level-title",
	educationList: "education-grid", // сітка
	educationCard: "education-card",
	eduInstitution: "edu-institution",
	eduMeta: "edu-meta",
	eduSeparator: "edu-separator",
	eduDetails: "edu-details",
	eduLabel: "edu-label",
	eduDoc: "edu-document",

	// ==========================================
	// ВКЛАДКА "ПРОФЕСІЙНА ДІЯЛЬНІСТЬ" (Job)
	// ==========================================
	jobContainer: "job-container",
	jobList: "job-grid",
	jobCard: "job-card",
	jobCompany: "job-company",
	jobMeta: "job-meta",
	jobSeparator: "job-separator",
	jobDetails: "job-details",
	jobLabel: "job-label",
	jobDoc: "job-document",

	// ==========================================
	// ВКЛАДКА "НАГОРОДИ ТА ВІДЗНАКИ" (Awards - Плитки зі сканами)
	// ==========================================
	awardsContainer: "awards-container",
	awardsList: "awards-grid",
	awardTile: "award-tile",
	awardTileCover: "award-tile-cover",
	awardTileImg: "award-tile-img",
	awardTileOverlay: "award-tile-overlay",
	awardTilePlaceholder: "award-tile-placeholder",
	awardTileContent: "award-tile-content",
	awardTileHeader: "award-tile-header",
	awardTileIconWrapper: "award-tile-icon-wrapper",
	awardTileIconImg: "award-tile-icon-img",
	awardTileGroup: "award-tile-group",
	awardTileTitle: "award-tile-title",
	awardTileMeta: "award-tile-meta",
	awardTileText: "award-tile-text",
	awardDoc: "award-document",

	// ==========================================
	// ВКЛАДКА "ВІЙСЬКОВА СЛУЖБА" (Military)
	// ==========================================
	militaryContainer: "mil-container",
	militaryCard: "award-card mil-card", // Перевикористовуємо базові стилі карток нагород
	militaryTitle: "award-title mil-title",
	militaryDetails: "mil-details",
	militaryDetailRow: "mil-detail-row",
	militaryDetailLabel: "mil-detail-label",
	militaryDetailVal: "mil-detail-val",
	militaryFiguresGrid: "mil-figures-grid",
	militaryTile: "award-tile mil-tile", // Перевикористовуємо базові стилі плиток
	militaryDepo: "award-document mil-depo",

	// ==========================================
	// УНІВЕРСАЛЬНА ТРАНСКРИПЦІЯ (Документи / Військові записи)
	// ==========================================
	docTranscription: "doc-transcription",
	docTranscriptionHeader: "doc-transcription-header",
	docTranscriptionText: "doc-transcription-text",
	docTranscriptionRow: "doc-transcription-row",
	docTranscriptionKey: "doc-transcription-key",
	docTranscriptionVal: "doc-transcription-val",
	docTranscriptionGroup: "doc-transcription-group",

	// ==========================================
	// НОВІ БЛОКИ: ІДЕНТИЧНІСТЬ, ПРОЖИВАННЯ, ОСОБИСТЕ, ГАЛЕРЕЯ
	// ==========================================

	// --- 1. Ідентичність та статус (Identity) ---
	identityContainer: "identity-container",
	identityGrid: "identity-grid",
	identityRow: "identity-row",
	identityLabel: "identity-label",
	identityVal: "identity-val",
	chipGroup: "chip-group",
	chipItem: "chip-item",
	chipItemPrimary: "chip-item--primary",
	chipIcon: "chip-icon",

	// --- 2. Проживання (Domicile - Timeline) ---
	domicileContainer: "domicile-container",
	domicileTimeline: "domicile-timeline",
	domicileNode: "domicile-node",
	domicileMarker: "domicile-marker",
	domicileContent: "domicile-content",
	domicilePeriod: "domicile-period",
	domicileType: "domicile-type",
	domicilePlace: "domicile-place",
	domicileAddress: "domicile-address",

	// --- 3. Особистий портрет (Personal) ---
	personalContainer: "personal-container",
	personalSection: "personal-section",
	personalSectionTitle: "personal-section-title",
	appearanceList: "appearance-list",
	appearanceItem: "appearance-item",
	appearanceKey: "appearance-key",
	appearanceVal: "appearance-val",
	petList: "pet-list",
	petCard: "pet-card",
	petName: "pet-name",
	petYears: "pet-years",
	personalText: "personal-text",

	// --- 4. Галерея профілю (Gallery) ---
	photoAlbumContainer: "photo-album-container",
	photoAlbumGrid: "photo-album-grid",
	photoCard: "photo-card",
	photoCardImgWrapper: "photo-card-img-wrapper",
	photoCardImg: "photo-card-img",
	photoCardCaption: "photo-card-caption",
	photoCardAlbumName: "photo-card-album-name",

	// Специфічні класи компонента ErrorState
	errorScreen: "error-screen",
	errorScreenIcon: "error-screen__icon",
	errorScreenTitle: "error-screen__title",
	errorScreenDesc: "error-screen__desc",
};
