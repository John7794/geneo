const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const regexLifespan = /const renderLifespanBlock = \(title, spans\) => \{.*?return \`\s*<div style="max-width: 800px; margin: 0 auto; width: 100%;">\s*<div class="analytics-stat-title" style="margin-bottom: 12px; font-weight: bold; font-size: 16px;">\$\{title\}<\/div>\s*<div style="display: flex; flex-direction: column; width: 100%; margin-bottom: 32px;">\s*\$\{rowsHtml\}\s*<\/div>\s*<\/div>\s*\`;\s*\};/s;

if (!regexLifespan.test(js)) {
    console.log("Could not find renderLifespanBlock");
    process.exit(1);
}

const replacementLifespan = `const renderLifespanBlock = (title, spans) => {
            if (spans.length === 0) return '';
			let sumAge = 0;
            let sumDays = 0;
            let hasExact = spans.some(s => s.exactDays !== null && s.exactDays !== undefined);

            let maxMetric = 0;
            if (hasExact) {
                maxMetric = spans.length > 0 ? Math.max(...spans.map(s => s.exactDays || (s.age * 365.25))) : 0;
            } else {
                maxMetric = spans.length > 0 ? Math.max(...spans.map(s => s.age)) : 0;
            }

			for(let i=0; i<spans.length; i++) {
				sumAge += spans[i].age;
                if (hasExact) {
                    sumDays += spans[i].exactDays || (spans[i].age * 365.25);
                }
			}
			const avgAge = Math.round(sumAge / spans.length);
            const avgDays = hasExact ? Math.round(sumDays / spans.length) : 0;
			
			const sortedSpans = [...spans].sort((a, b) => {
                if (hasExact) {
                    let aVal = a.exactDays !== null && a.exactDays !== undefined ? a.exactDays : (a.age * 365.25);
                    let bVal = b.exactDays !== null && b.exactDays !== undefined ? b.exactDays : (b.age * 365.25);
                    return bVal - aVal;
                }
                return b.age - a.age;
            });
			
			const makeTag = (obj) => {
				const shortName = obj.name ? obj.name.replace(/[\\\\?0-9]/g, '').trim() : "Невідомо";
                let metric = hasExact ? (obj.exactDays !== null && obj.exactDays !== undefined ? obj.exactDays : (obj.age * 365.25)) : obj.age;
                const widthPercent = maxMetric > 0 ? (metric / maxMetric) * 100 : 0;
                
                let displayAge = obj.age + " р.";
                if (obj.exactDays !== null && obj.exactDays !== undefined) {
                    let y = Math.floor(obj.exactDays / 365.25);
                    let d = Math.round(obj.exactDays % 365.25);
                    displayAge = y + " р. " + d + " дн.";
                }

                let avatarHtml = '';
                if (obj && obj.id && window.app && window.app.engine && window.app.engine.db) {
                    const person = window.app.engine.db.names.find(n => n.id === obj.id);
                    if (person) {
                        const avatarPath = window.app.engine.getPersonPhoto(person);
                        if (avatarPath) {
                            avatarHtml = \`<img src="\${avatarPath}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;" />\`;
                        } else {
                            avatarHtml = \`<div style="width: 24px; height: 24px; border-radius: 50%; background: var(--color-bg-body); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 10px;"><i class="ri-user-3-line"></i></div>\`;
                        }
                    }
                } else if (obj) {
                     avatarHtml = \`<div style="width: 24px; height: 24px; border-radius: 50%; background: var(--color-bg-body); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 10px;"><i class="ri-user-3-line"></i></div>\`;
                }

				return \`
                <div style="width: 100%; display: flex; align-items: center; margin-bottom: 8px;">
                    <a href="#" onclick="event.preventDefault(); if(window.app && window.app.navigateToId) { window.app.navigateToId('\${obj.id}', false, 'profile'); }" style="position: relative; display: flex; align-items: center; background: var(--color-bg-body); border-radius: 8px; text-decoration: none; color: var(--color-text-main); font-size: 14px; transition: opacity 0.2s; width: 100%; overflow: hidden; border: 1px solid var(--color-border);" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                        <div style="position: absolute; top: 0; left: 0; height: 100%; width: \${Math.max(2, widthPercent)}%; background: var(--color-bg-card); z-index: 0; border-right: 2px solid var(--color-primary); opacity: 0.8; transition: width 0.5s ease-in-out;"></div>
                        <div style="position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; padding: 6px 16px 6px 6px; width: 100%;">
                            \${avatarHtml}
                            <span style="font-weight: 500; white-space: nowrap;">\${shortName}</span>
                            <span style="margin-left: auto; color: var(--color-text-meta); font-size: 12px; font-weight: bold; background: var(--color-bg-body); padding: 2px 8px; border-radius: 12px; z-index: 2;">\${displayAge}</span>
                        </div>
                    </a>
                </div>\`;
			};
			
            let rowsHtml = '';
            let avgLineInserted = false;
            
            sortedSpans.forEach(s => {
                let currentMetric = hasExact ? (s.exactDays !== null && s.exactDays !== undefined ? s.exactDays : (s.age * 365.25)) : s.age;
                let targetAvg = hasExact ? avgDays : avgAge;

                if (!avgLineInserted && currentMetric < targetAvg) {
                    let displayAvg = targetAvg;
                    if (hasExact) {
                        let y = Math.floor(targetAvg / 365.25);
                        let d = Math.round(targetAvg % 365.25);
                        displayAvg = y + " р. " + d + " дн.";
                    } else {
                        displayAvg = targetAvg + " р.";
                    }
                    rowsHtml += \`<div style="display: flex; align-items: center; margin: 16px 0; color: var(--color-text-muted); font-size: 13px; width: 100%;">
                        Середній вік: \${displayAvg}
                        <div style="flex-grow: 1; height: 1px; border-bottom: 1px dashed var(--color-border); margin-left: 12px; opacity: 0.5;"></div>
                    </div>\`;
                    avgLineInserted = true;
                }
                rowsHtml += makeTag(s);
            });
            
            if (!avgLineInserted) {
                    let displayAvg = hasExact ? avgDays : avgAge;
                    if (hasExact) {
                        let y = Math.floor(avgDays / 365.25);
                        let d = Math.round(avgDays % 365.25);
                        displayAvg = y + " р. " + d + " дн.";
                    } else {
                        displayAvg = avgAge + " р.";
                    }
                 rowsHtml += \`<div style="display: flex; align-items: center; margin: 16px 0; color: var(--color-text-muted); font-size: 13px; width: 100%;">
                        Середній вік: \${displayAvg}
                        <div style="flex-grow: 1; height: 1px; border-bottom: 1px dashed var(--color-border); margin-left: 12px; opacity: 0.5;"></div>
                    </div>\`;
            }
            
            return \`
                <div style="width: 100%;">
                    <div class="analytics-stat-title" style="margin-bottom: 16px; font-weight: 600; font-size: 16px; color: var(--color-text-main);">\${title}</div>
                    <div style="display: flex; flex-direction: column; width: 100%; margin-bottom: 32px;">
                        \${rowsHtml}
                    </div>
                </div>
            \`;
        };`;

js = js.replace(regexLifespan, replacementLifespan);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
console.log("Success render lifespan block");
