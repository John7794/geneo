const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const regex = /let dateStr = [^;]+;[\s\S]*?<\/li>\\n\s*\\`;/m;

const newStr = `let dateStr = \\\`<div style="font-weight: 500; color: var(--color-text-main);">\${evt.gregorian.day} \${getMonthName(evt.gregorian.month)}\${evt.year && !isNaN(evt.year) ? ' ' + evt.gregorian.year : ''}</div>\\\`;
                    if (evt.original.isOldStyle) {
                        dateStr += \\\`<div style="font-size: 11px; color: var(--color-text-muted); margin-top: 2px;">(\${evt.original.day} \${getMonthName(evt.original.month)} за ст.ст.)</div>\\\`;
                    }
                    
                    let p1Html = \\\`<a href="?id=\${encodeURIComponent(evt.person.id)}&view=profile" class="analytics-person-link js-stop-prop" data-pid="\${evt.person.id}" style="color: var(--color-primary); text-decoration: none; font-weight: 500;">\${escapeHtml(evt.person.name)}</a>\\\`;
                    let p2Html = "";
                    if (evt.type === "marriage" && evt.spouse) {
                        p2Html = \\\` та <a href="?id=\${encodeURIComponent(evt.spouse.id)}&view=profile" class="analytics-person-link js-stop-prop" data-pid="\${evt.spouse.id}" style="color: var(--color-primary); text-decoration: none; font-weight: 500;">\${escapeHtml(evt.spouse.name)}</a>\\\`;
                    }
                    
                    html += \\\`
                        <li style="list-style: none; display: flex; flex-direction: row; flex-wrap: wrap; gap: 16px; background: var(--color-bg-card); border: 1px solid var(--color-border-light); border-radius: 8px; padding: 12px 16px; margin-bottom: 8px; align-items: center;">
                            <div style="min-width: 130px; flex-shrink: 0;">\${dateStr}</div>
                            <div style="font-size: 14px; color: var(--color-text-muted); min-width: 100px; flex-shrink: 0;">\${typeLabels[evt.type]}</div>
                            <div style="font-size: 15px; color: var(--color-text-main); flex-grow: 1;">\${p1Html}\${p2Html}</div>
                        </li>
                    \\\`;`;

if (regex.test(code)) {
    code = code.replace(regex, newStr);
    fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
    console.log("Success formatting events");
} else {
    console.log("Target regex not found.");
}
