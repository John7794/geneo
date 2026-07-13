const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const regex = /const renderLifespanBlock = \(title, spans\) => \{[\s\S]*?\}\s*;\s*lifespanHtml \+= renderLifespanBlock/g;

const replacement = `const renderLifespanBlock = (title, spans) => {
            if (spans.length === 0) return '';
			let sum = 0;
            let maxAge = spans.length > 0 ? Math.max(...spans.map(s => s.age)) : 0;
			for(let i=0; i<spans.length; i++) {
				sum += spans[i].age;
			}
			const avg = Math.round(sum / spans.length);
			
			const sortedSpans = [...spans].sort((a, b) => b.age - a.age);
			
			const makeTag = (obj) => {
				const shortName = obj.name ? obj.name.replace(/[\\?0-9]/g, '').trim() : "Невідомо";
                const widthPercent = maxAge > 0 ? (obj.age / maxAge) * 100 : 0;
				return \`<a href="#" onclick="event.preventDefault(); if(window.app && window.app.navigateToId) { window.app.navigateToId('\${obj.id}', false, 'profile'); }" style="display: flex; align-items: center; background: var(--color-primary-light); border: 1px solid var(--color-border); border-radius: 20px; padding: 4px 12px 4px 4px; text-decoration: none; color: var(--color-text-main); font-size: 14px; gap: 8px; transition: opacity 0.2s; width: \${widthPercent}%; min-width: 120px; margin-bottom: 4px;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
					<span style="background: var(--color-primary); color: white; border-radius: 16px; padding: 2px 8px; font-weight: bold; font-size: 13px; flex-shrink: 0;">\${obj.age}</span>
					<span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500;">\${shortName}</span>
				</a>\`;
			};
			
            let rowsHtml = '';
            let avgLineInserted = false;
            
            sortedSpans.forEach(s => {
                if (!avgLineInserted && s.age < avg) {
                    rowsHtml += \`<div style="display: flex; align-items: center; margin: 12px 0; color: var(--color-text-muted); font-size: 13px; width: 100%;">
                        Середній вік: \${avg}
                        <div style="flex-grow: 1; height: 1px; background: var(--color-primary); margin-left: 12px; opacity: 0.3;"></div>
                    </div>\`;
                    avgLineInserted = true;
                }
                rowsHtml += makeTag(s);
            });
            
            if (!avgLineInserted) {
                 rowsHtml += \`<div style="display: flex; align-items: center; margin: 12px 0; color: var(--color-text-muted); font-size: 13px; width: 100%;">
                        Середній вік: \${avg}
                        <div style="flex-grow: 1; height: 1px; background: var(--color-primary); margin-left: 12px; opacity: 0.3;"></div>
                    </div>\`;
            }

            return \`
                <div style="max-width: 800px; margin: 0 auto; width: 100%;">
                    <div class="analytics-stat-title" style="margin-bottom: 12px; font-weight: bold; font-size: 16px;">\${title}</div>
                    <div style="display: flex; flex-direction: column; width: 100%; margin-bottom: 32px;">
                        \${rowsHtml}
                    </div>
                </div>
            \`;
        };
        
        lifespanHtml += renderLifespanBlock`;

js = js.replace(regex, replacement);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
console.log("Updated layout and tags!");
