const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const lifespanRegex = /const renderLifespanBlock = \(title, spans\) => \{[\s\S]*?\}\s*};\s*lifespanHtml \+= renderLifespanBlock\('Підтверджений', lifespansConfirmed\);/g;

const lifespanReplacement = `const renderLifespanBlock = (title, spans) => {
            if (spans.length === 0) return '';
			let sum = 0;
            let maxAge = spans.length > 0 ? spans[0].age : 0;
			for(let i=0; i<spans.length; i++) {
				sum += spans[i].age;
                if (spans[i].age > maxAge) maxAge = spans[i].age;
			}
			const avg = Math.round(sum / spans.length);
			
			const sortedSpans = [...spans].sort((a, b) => b.age - a.age);
			
			const makeTag = (obj) => {
				const shortName = obj.name ? obj.name.replace(/[\\?0-9]/g, '').trim() : "Невідомо";
                const widthPercent = maxAge > 0 ? (obj.age / maxAge) * 100 : 0;
				return \`<a href="#" onclick="event.preventDefault(); if(window.app && window.app.navigateToId) { window.app.navigateToId('\${obj.id}', false, 'profile'); }" style="display: flex; align-items: center; background: var(--color-surface); border: 1px solid var(--color-border-light); border-radius: 20px; padding: 4px 12px 4px 4px; text-decoration: none; color: var(--color-text-main); font-size: 14px; gap: 8px; transition: background 0.2s; width: \${widthPercent}%; min-width: max-content; margin-bottom: 4px;" onmouseover="this.style.background='var(--color-bg)'" onmouseout="this.style.background='var(--color-surface)'">
					<span style="background: var(--color-primary); color: white; border-radius: 16px; padding: 2px 8px; font-weight: bold; font-size: 13px;">\${obj.age}</span>
					<span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\${shortName}</span>
				</a>\`;
			};
			
            let rowsHtml = '';
            let avgLineInserted = false;
            
            sortedSpans.forEach(s => {
                if (!avgLineInserted && s.age < avg) {
                    rowsHtml += \`<div style="display: flex; align-items: center; margin: 8px 0; color: var(--color-text-muted); font-size: 13px; width: 100%;">
                        <div style="flex-grow: 1; height: 1px; background: var(--color-border-light); margin-right: 12px;"></div>
                        Середній вік: \${avg}
                        <div style="flex-grow: 1; height: 1px; background: var(--color-border-light); margin-left: 12px;"></div>
                    </div>\`;
                    avgLineInserted = true;
                }
                rowsHtml += makeTag(s);
            });
            
            if (!avgLineInserted) {
                 rowsHtml += \`<div style="display: flex; align-items: center; margin: 8px 0; color: var(--color-text-muted); font-size: 13px; width: 100%;">
                        <div style="flex-grow: 1; height: 1px; background: var(--color-border-light); margin-right: 12px;"></div>
                        Середній вік: \${avg}
                        <div style="flex-grow: 1; height: 1px; background: var(--color-border-light); margin-left: 12px;"></div>
                    </div>\`;
            }

            return \`
                <div class="analytics-stat-title" style="margin-bottom: 12px; font-weight: bold;">\${title}</div>
                <div style="display: flex; flex-direction: column; width: 100%; margin-bottom: 24px;">
					\${rowsHtml}
				</div>
            \`;
        };
        
        lifespanHtml += renderLifespanBlock('Підтверджений', lifespansConfirmed);`;

const deathRegex = /const containerDeaths = document\.getElementById\("analytics-deaths"\);[\s\S]*?\}\s*\/\/ Coats of arms/g;

const deathReplacement = `const containerDeaths = document.getElementById("analytics-deaths");
        if (containerDeaths && this.engine.db.death) {
            const deathsMap = {};
            this.engine.db.death.forEach(d => {
                let cause = d[COLUMNS.death?.cause || "d_cause"];
                if (cause && String(cause).trim() !== "") {
                    cause = String(cause).trim();
                    deathsMap[cause] = (deathsMap[cause] || 0) + 1;
                }
            });
            const topDeaths = Object.entries(deathsMap).sort((a, b) => b[1] - a[1]);
            containerDeaths.style.display = "flex";
            containerDeaths.style.flexWrap = "wrap";
            containerDeaths.style.gap = "8px";
            containerDeaths.innerHTML = topDeaths.map(d => \`
                <li style="list-style: none; display: inline-flex; align-items: center; gap: 6px; background: var(--color-surface); border: 1px solid var(--color-border-light); border-radius: 8px; padding: 4px 12px; font-size: 14px; color: var(--color-text-main);">
                    <span>\${d[0]}</span>
                    <span style="background: var(--color-bg); padding: 2px 6px; border-radius: 12px; font-size: 12px; color: var(--color-text-muted);">\${d[1]}</span>
                </li>
            \`).join("");
        }

// Coats of arms`;

js = js.replace(lifespanRegex, lifespanReplacement);
js = js.replace(deathRegex, deathReplacement);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
console.log("Updated lifespan and deaths blocks!");
