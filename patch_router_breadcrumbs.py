import re

with open('scripts/core/router.js', 'r') as f:
    js = f.read()

old_analytics_mode = """		} else if (mode === "analytics") {
			document.body.classList.remove("error-state-active");
			if (treeViewEl) treeViewEl.classList.add("hidden");
			if (profileContentEl) profileContentEl.classList.add("hidden");
			if (analyticsViewEl) analyticsViewEl.classList.remove("hidden");
		}"""

new_analytics_mode = """		} else if (mode === "analytics") {
			document.body.classList.remove("error-state-active");
			if (treeViewEl) treeViewEl.classList.add("hidden");
			if (profileContentEl) profileContentEl.classList.add("hidden");
			if (analyticsViewEl) analyticsViewEl.classList.remove("hidden");
		}
		
		const breadcrumbsEl = document.getElementById("breadcrumbs-container");
		if (breadcrumbsEl) {
		    if (mode === "analytics") breadcrumbsEl.style.display = "none";
		    else breadcrumbsEl.style.display = "";
		}"""

js = js.replace(old_analytics_mode, new_analytics_mode)

with open('scripts/core/router.js', 'w') as f:
    f.write(js)
print("Router patched for breadcrumbs")
