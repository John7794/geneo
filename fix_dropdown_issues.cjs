const fs = require('fs');

// 1. Fix index.html button background and back button margin
let html = fs.readFileSync('index.html', 'utf8');

// Change back button margin
const oldBackBtn = `<button id="btn-back-to-summary" class="btn" style="background: transparent; border: none; padding: 0; box-shadow: none; color: var(--color-text-main); font-weight: 500; height: auto;">`;
const newBackBtn = `<button id="btn-back-to-summary" class="btn" style="background: transparent; border: none; padding: 0; box-shadow: none; color: var(--color-text-main); font-weight: 500; height: auto; margin-left: -8px;">`;
if (html.includes(oldBackBtn)) {
    html = html.replace(oldBackBtn, newBackBtn);
}

// Change select background to transparent
html = html.replace('background: var(--color-bg-card); cursor: pointer; width: 100%;', 'background: transparent; cursor: pointer; width: 100%;');

fs.writeFileSync('index.html', html);

// 2. Add JS to handle arrow rotation reliably
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const targetSelect = `            const selectFilter = document.getElementById("timeline-filter-type");
            if (selectFilter) {
                selectFilter.addEventListener("change", (e) => {
                    currentFilter = e.target.value;
                    renderTimeline();
                });
            }`;

const newSelect = `            const selectFilter = document.getElementById("timeline-filter-type");
            const filterIcon = document.querySelector(".timeline-filter-icon");
            if (selectFilter) {
                let isOpen = false;
                
                const closeSelect = () => {
                    isOpen = false;
                    if (filterIcon) filterIcon.style.transform = "rotate(0deg)";
                };
                
                selectFilter.addEventListener("mousedown", () => {
                    isOpen = !isOpen;
                    if (filterIcon) filterIcon.style.transform = isOpen ? "rotate(180deg)" : "rotate(0deg)";
                });
                selectFilter.addEventListener("blur", closeSelect);
                
                selectFilter.addEventListener("change", (e) => {
                    currentFilter = e.target.value;
                    closeSelect();
                    renderTimeline();
                });
            }`;

if (js.includes(targetSelect)) {
    js = js.replace(targetSelect, newSelect);
    fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
} else {
    console.log("Could not find selectFilter code in JS.");
}

