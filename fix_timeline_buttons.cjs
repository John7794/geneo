const fs = require('fs');

let content = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const target = `            if (btnViewList && btnViewChart) {
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
                };`;
                
const replacement = `            const filterTypeSelect = document.getElementById("timeline-filter-type");
            const sortBtn = document.getElementById("timeline-sort-btn");
            
            if (btnViewList && btnViewChart) {
                const updateButtonStyles = () => {
                    if (timelineViewMode === "list") {
                        btnViewList.style.background = 'var(--color-primary)';
                        btnViewList.style.color = 'white';
                        btnViewChart.style.background = 'transparent';
                        btnViewChart.style.color = 'var(--color-text-main)';
                        if (filterTypeSelect) filterTypeSelect.style.display = 'inline-flex';
                        if (sortBtn) sortBtn.style.display = 'inline-flex';
                    } else {
                        btnViewChart.style.background = 'var(--color-primary)';
                        btnViewChart.style.color = 'white';
                        btnViewList.style.background = 'transparent';
                        btnViewList.style.color = 'var(--color-text-main)';
                        if (filterTypeSelect) filterTypeSelect.style.display = 'none';
                        if (sortBtn) sortBtn.style.display = 'none';
                    }
                };`;

content = content.replace(target, replacement);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', content);
