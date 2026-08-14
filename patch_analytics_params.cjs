const fs = require('fs');
const file = 'scripts/core/router.js';
let content = fs.readFileSync(file, 'utf8');

// Patch navigateToId
content = content.replace(
	/const currentView = url\.searchParams\.get\("view"\);\s*if \(currentView === "profile"\) \{/,
	'const currentView = url.searchParams.get("view");\n\t\tif (currentView !== "analytics") {'
);

// Patch _normalizeUrlParams
content = content.replace(
	/if \(viewParam === "profile"\) \{/,
	'if (viewParam !== "analytics") {'
);

fs.writeFileSync(file, content);
