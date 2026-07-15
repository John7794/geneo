const fs = require('fs');
const file = 'scripts/components/interaction/analyticsManager.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `	initAccordions() {
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
	}`;

const replacementStr = `	initAccordions() {
	    const container = document.getElementById("analytics-view");
	    if (!container) return;
	    const sections = container.querySelectorAll(".analytics-section");
        sections.forEach(sec => {
            const h4 = sec.querySelector("h4");
            if (h4 && !h4.dataset.accordionInit) {
                h4.dataset.accordionInit = "true";
                
                const icon = document.createElement("i");
                icon.className = "ri-arrow-down-s-line analytics-mobile-accordion-icon";
                h4.appendChild(icon);

                h4.addEventListener("click", () => {
                    if (window.innerWidth <= 768) {
                        sec.classList.toggle("accordion-open");
                    }
                });
            }
        });
	}`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(file, content);
console.log('Accordions patched!');
