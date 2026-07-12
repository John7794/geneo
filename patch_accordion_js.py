import re

with open('scripts/components/interaction/analyticsManager.js', 'r') as f:
    js = f.read()

# find open method or render/calculateStats
old_open = """	open() {
		this.container = document.getElementById("analytics-view");
		if (this.container) {
			this.container.classList.remove("hidden");
			this.calculateStats();
		}
	}"""

new_open = """	open() {
		this.container = document.getElementById("analytics-view");
		if (this.container) {
			this.container.classList.remove("hidden");
			this.calculateStats();
			this.initAccordions();
		}
	}
	
	initAccordions() {
	    const sections = this.container.querySelectorAll(".analytics-section");
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
	}"""

js = js.replace(old_open, new_open)

with open('scripts/components/interaction/analyticsManager.js', 'w') as f:
    f.write(js)
print("Accordion JS added")
