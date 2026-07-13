const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const wireupCode = `            this.containerSummary.innerHTML = html;
            
             const navBtns = this.containerSummary.querySelectorAll('.analytics-nav-btn');
             const detailedView = document.getElementById("analytics-detailed-view");
             const btnBack = document.getElementById("btn-back-to-summary");
             const titleView = document.getElementById("detailed-view-title");

             navBtns.forEach(btn => {
                 btn.addEventListener("click", (e) => {
                     e.preventDefault();
                     const targetId = btn.getAttribute("data-target");
                     const title = btn.getAttribute("data-title");
                     
                     this.containerSummary.style.display = "none";
                     if (detailedView) {
                         detailedView.style.display = "flex";
                         
                         const sections = detailedView.querySelectorAll('.analytics-section');
                         sections.forEach(sec => sec.style.display = 'none');
                         
                         const targetEl = document.getElementById(targetId);
                         if (targetEl) {
                             const parentSec = targetEl.closest('.analytics-section');
                             if (parentSec) {
                                 parentSec.style.display = 'block';
                                 const h4 = parentSec.querySelector('h4');
                                 if (h4) h4.style.display = 'none'; // hide the h4 because we show it in the header
                             }
                         }

                         if (titleView) titleView.textContent = title;
                     }
                 });
             });

             if (btnBack && !btnBack.dataset.init) {
                 btnBack.dataset.init = "true";
                 btnBack.addEventListener("click", () => {
                     if (detailedView) detailedView.style.display = "none";
                     this.containerSummary.style.display = "flex";
                 });
             }
`;

js = js.replace('            this.containerSummary.innerHTML = html;', wireupCode);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
console.log("Success wireup");
