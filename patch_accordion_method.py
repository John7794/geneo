import re

with open('scripts/components/interaction/analyticsManager.js', 'r') as f:
    js = f.read()

method = """	initAccordions() {
	    const container = document.getElementById("analytics-view");
	    if (!container) return;
	    const sections = container.querySelectorAll(".analytics-section");
        sections.forEach(sec => {
            const h4 = sec.querySelector("h4");
            if (h4 && !h4.dataset.accordionInit) {
                h4.dataset.accordionInit = "true";
                h4.addEventListener("click", () => {
                    if (window.innerWidth <= 768) {
                        sec.classList.toggle("accordion-open");
                    }
                });
            }
        });
	}

	calculateStats()"""

js = js.replace("	calculateStats()", method)

with open('scripts/components/interaction/analyticsManager.js', 'w') as f:
    f.write(js)
print("initAccordions method added")
