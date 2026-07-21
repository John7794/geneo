const fs = require('fs');
let jsCode = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const newRenderBlock = `                    const peopleHtml = peopleList.length > 0 
                        ? \`<ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;">
                            \${peopleList.map(person => \`
                                <li style="padding: 12px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 8px; list-style: none;">
                                    <div style="font-size: 15px; color: var(--color-text-main); line-height: 1.4;">
                                        <a href="?id=\${encodeURIComponent(person.pid)}&view=profile" class="analytics-person-link js-stop-prop" data-pid="\${person.pid}" style="color: var(--color-primary); text-decoration: none;">\${escapeHtml(person.name)}</a>
                                    </div>
                                </li>
                            \`).join("")}
                          </ul>\` 
                        : "";

                    return \`
                    <li class="analytics-death-item" style="list-style: none; margin-top: \${d[0] === topDeaths[0][0] ? '0' : '24px'}; margin-bottom: 12px; padding-bottom: 4px;">
                        <div class="analytics-death-header" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; border-bottom: 2px solid var(--color-border); padding-bottom: 8px;">
                            <h3 style="margin: 0; font-size: 20px; color: var(--color-text-main);">\${cause}</h3>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 16px; font-weight: 600; color: var(--color-text-muted);">\${count}</span>
                                <i class="ri-arrow-down-s-line analytics-death-icon analytics-mobile-only" style="transition: transform 0.3s; color: var(--color-text-main); font-size: 24px; transform: rotate(180deg);"></i>
                            </div>
                        </div>
                        <div class="analytics-death-body" style="display: block; padding-top: 16px;">
                            \${peopleHtml}
                        </div>
                    </li>
                \`}).join("");

                // Add accordion behavior
                const deathItems = containerDeaths.querySelectorAll('.analytics-death-item');
                deathItems.forEach(item => {
                    const header = item.querySelector('.analytics-death-header');
                    const body = item.querySelector('.analytics-death-body');
                    const icon = item.querySelector('.analytics-death-icon');
                    
                    const isDesktop = window.innerWidth >= 1200;
                    if (!isDesktop) {
                        body.style.display = 'none';
                        if (icon) icon.style.transform = 'rotate(0deg)';
                    } else {
                        header.style.cursor = 'default';
                    }

                    header.addEventListener('click', () => {
                        if (window.innerWidth >= 1200) return;
                        const isOpen = body.style.display === 'block';
                        body.style.display = isOpen ? 'none' : 'block';
                        if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
                    });
                });`;

const startMarker = "const peopleHtml = peopleList.length > 0";
const endMarker = "        // Events Calendar";

const startIndex = jsCode.indexOf(startMarker);
const endIndex = jsCode.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const replaceStr = newRenderBlock + "\n                            }\n        }\n\n";
    jsCode = jsCode.substring(0, startIndex) + replaceStr + jsCode.substring(endIndex);
    fs.writeFileSync('scripts/components/interaction/analyticsManager.js', jsCode);
    console.log("Success");
} else {
    console.log("Markers not found");
}

