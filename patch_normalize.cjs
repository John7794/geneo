const fs = require('fs');
const file = 'scripts/core/router.js';
let content = fs.readFileSync(file, 'utf8');

const target = `		if (!viewParam) {
			currentUrl.searchParams.set("view", "tree");
			needsUpdate = true;
		}`;
const replacement = `		if (!viewParam) {
			currentUrl.searchParams.set("view", "tree");
			viewParam = "tree";
			needsUpdate = true;
		}

		if (viewParam === "profile") {
			if (currentUrl.searchParams.has("timeline_mode")) {
				currentUrl.searchParams.delete("timeline_mode");
				needsUpdate = true;
			}
			if (currentUrl.searchParams.has("timeline_start")) {
				currentUrl.searchParams.delete("timeline_start");
				needsUpdate = true;
			}
			if (currentUrl.searchParams.has("timeline_end")) {
				currentUrl.searchParams.delete("timeline_end");
				needsUpdate = true;
			}
		}`;
content = content.replace(target, replacement);
fs.writeFileSync(file, content);
