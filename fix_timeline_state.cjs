const fs = require('fs');

let content = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const target1 = `            let sortDesc = true;
            let currentFilter = "all";
            let timelineViewMode = "list";`;
            
const replacement1 = `            let sortDesc = true;
            let currentFilter = "all";
            if (!this.timelineViewMode) {
                this.timelineViewMode = "list";
            }
            let timelineViewMode = this.timelineViewMode;`;

content = content.replace(target1, replacement1);

const target2 = `            if (btnViewList && btnViewChart) {
                btnViewList.addEventListener("click", () => {
                    timelineViewMode = "list";
                    btnViewList.style.background = 'var(--color-primary)';
                    btnViewList.style.color = 'white';
                    btnViewChart.style.background = 'transparent';
                    btnViewChart.style.color = 'var(--color-text-main)';
                    renderTimeline();
                });
                btnViewChart.addEventListener("click", () => {
                    timelineViewMode = "chart";
                    btnViewChart.style.background = 'var(--color-primary)';
                    btnViewChart.style.color = 'white';
                    btnViewList.style.background = 'transparent';
                    btnViewList.style.color = 'var(--color-text-main)';
                    renderTimeline();
                });
            }`;

const replacement2 = `            if (btnViewList && btnViewChart) {
                const updateButtonStyles = () => {
                    if (timelineViewMode === "list") {
                        btnViewList.style.background = 'var(--color-primary)';
                        btnViewList.style.color = 'white';
                        btnViewChart.style.background = 'transparent';
                        btnViewChart.style.color = 'var(--color-text-main)';
                    } else {
                        btnViewChart.style.background = 'var(--color-primary)';
                        btnViewChart.style.color = 'white';
                        btnViewList.style.background = 'transparent';
                        btnViewList.style.color = 'var(--color-text-main)';
                    }
                };
                
                updateButtonStyles();
                
                btnViewList.addEventListener("click", () => {
                    this.timelineViewMode = "list";
                    timelineViewMode = "list";
                    updateButtonStyles();
                    renderTimeline();
                });
                btnViewChart.addEventListener("click", () => {
                    this.timelineViewMode = "chart";
                    timelineViewMode = "chart";
                    updateButtonStyles();
                    renderTimeline();
                });
            }`;

content = content.replace(target2, replacement2);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', content);
