const fs = require('fs');
let jsCode = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldRenderBlock = `                    const peopleHtml = peopleList.length > 0 
                        ? \`<ul style="margin: 8px 0 0 12px; padding: 0; list-style: disc; font-size: 13px; color: var(--color-text-muted);">
                            \${peopleList.map(person => \`<li style="margin-bottom: 4px;"><a href="?id=\${encodeURIComponent(person.pid)}&view=profile" class="js-stop-prop analytics-person-link" data-pid="\${person.pid}" style="color: var(--color-primary); text-decoration: none;">\${person.name}</a></li>\`).join("")}
                          </ul>\` 
                        : "";

                    return \`
                    <li class="analytics-death-item" style="list-style: none; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden;">
                        <div class="analytics-death-header" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; cursor: pointer; user-select: none;">
                            <span style="font-size: 15px; font-weight: 500; color: var(--color-text-main);">\${cause}</span>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="background: var(--color-bg-body); padding: 4px 10px; border-radius: 12px; font-size: 13px; font-weight: 500; color: var(--color-text-muted);">\${count}</span>
                                <i class="ri-arrow-down-s-line analytics-death-icon" style="transition: transform 0.3s; color: var(--color-text-muted);"></i>
                            </div>
                        </div>
                        <div class="analytics-death-body" style="display: none; padding: 0 16px 16px 16px; border-top: 1px dashed var(--color-border-light); margin-top: 4px; padding-top: 12px;">
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

                    header.addEventListener('click', () => {
                    const isOpen = body.style.display === 'block';
                        body.style.display = isOpen ? 'none' : 'block';
                        icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
                    });
                });`;

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

if (jsCode.includes(oldRenderBlock.substring(0, 100))) {
    // using a more robust replacement since indentation might differ
    const regex = /const peopleHtml = peopleList\.length > 0[\s\S]*?\}\);\s*\}\);\s*\}\s*\}/;
    const match = jsCode.match(regex);
    if (match) {
        // adjust the regex to match up to the end of deathItems.forEach
        // Wait, the newRenderBlock replaces up to `});`. So let's match correctly.
    }
}

// Safer replace
const startMarker = "const peopleHtml = peopleList.length > 0";
const endMarker = "        // Events Calendar";

const startIndex = jsCode.indexOf(startMarker);
const endIndex = jsCode.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const originalPart = jsCode.substring(startIndex, endIndex);
    
    // Check if we already modified it
    if (originalPart.includes("padding: 12px; background: var(--color-bg-card);")) {
        console.log("Already modified.");
    } else {
        const replaceStr = newRenderBlock + "\n                            }\n        }\n\n";
        jsCode = jsCode.substring(0, startIndex) + replaceStr + jsCode.substring(endIndex);
        fs.writeFileSync('scripts/components/interaction/analyticsManager.js', jsCode);
        console.log("Success");
    }
} else {
    console.log("Markers not found");
}

