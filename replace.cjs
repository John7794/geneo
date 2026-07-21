const fs = require('fs');
const file = '/app/applet/scripts/components/interaction/analyticsManager.js';
let content = fs.readFileSync(file, 'utf8');

const target1 = `                                                        const peopleHtml = peopleList.length > 0 
                                        ? \`<ul style="margin: 8px 0 0 12px; padding: 0; list-style: disc; font-size: 13px; color: var(--color-text-muted);">
                                            \${peopleList.map(personName => \`<li style="margin-bottom: 4px;">\${personName}</li>\`).join("")}
                                          </ul>\` 
                                        : "";
                                    return \`
                                        <li style="list-style: none; margin-top: 8px; margin-bottom: 4px; margin-left: 12px;">
                                            <div style="font-size: 14px; font-weight: 600; color: var(--color-text-muted); margin-bottom: 4px; text-transform: capitalize;">\${evtName} <span style="font-weight: normal;">(\${evtCount})</span></div>
                                            \${peopleHtml}
                                        </li>
                                    \`;`;

const replacement1 = `                                    const peopleHtml = peopleList.length > 0 
                                        ? \`<ul style="list-style: none; padding-left: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;">
                                            \${peopleList.map(personName => \`
                                            <li style="list-style: none; display: flex; align-items: flex-start; gap: 8px; margin-left: 12px;">
                                                <div style="width: 6px; height: 6px; border-radius: 50%; background: var(--color-primary); margin-top: 8px; flex-shrink: 0;"></div>
                                                <div style="flex: 1;">
                                                    <div style="font-size: 15px; color: var(--color-text-main);">\${personName}</div>
                                                </div>
                                            </li>\`).join("")}
                                          </ul>\` 
                                        : "";
                                    return \`
                                        <li style="list-style: none; margin-top: 16px; margin-bottom: 8px;">
                                            <div style="margin: 0 0 8px 12px; font-size: 14px; font-weight: 600; color: var(--color-text-main); background: var(--color-bg-sub); padding: 4px 12px; border-radius: 4px; display: inline-block; text-transform: capitalize;">\${evtName} <span style="font-weight: normal; margin-left: 4px;">(\${evtCount})</span></div>
                                            \${peopleHtml}
                                        </li>
                                    \`;`;


content = content.replace(target1, replacement1);

const target2 = `            const sortContainerPlaces = document.createElement("div");
            sortContainerPlaces.className = "analytics-sort-controls";
            sortContainerPlaces.style.marginBottom = "16px";
            sortContainerPlaces.innerHTML = \`
                    <div class="analytics-sort-desktop" style="display: flex; gap: 8px;">
                        <span style="font-size: 14px; color: var(--color-text-muted); margin-right: 8px; display: flex; align-items: center;">Сортувати за:</span>
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="frequency">За популярністю</button>
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="appearance">За згадкою</button>
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="alphabet_az">А - Я</button>
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="alphabet_za">Я - А</button>
                    </div>`;

const replacement2 = `            const sortContainerPlaces = document.createElement("div");
            sortContainerPlaces.className = "analytics-sort-controls";
            sortContainerPlaces.style.marginBottom = "24px";
            sortContainerPlaces.style.background = "var(--color-bg-card)";
            sortContainerPlaces.style.padding = "12px 16px";
            sortContainerPlaces.style.borderRadius = "12px";
            sortContainerPlaces.style.border = "1px solid var(--color-border)";
            sortContainerPlaces.style.display = "flex";
            sortContainerPlaces.style.alignItems = "center";
            sortContainerPlaces.innerHTML = \`
                    <div class="analytics-sort-desktop" style="display: flex; gap: 8px; width: 100%; align-items: center;">
                        <span style="font-size: 14px; font-weight: 500; color: var(--color-text-main); margin-right: auto; display: flex; align-items: center;">Сортувати за:</span>
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="frequency">За популярністю</button>
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="appearance">За згадкою</button>
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="alphabet_az">А - Я</button>
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="alphabet_za">Я - А</button>
                    </div>`;

content = content.replace(target2, replacement2);

fs.writeFileSync(file, content);
console.log("Replaced successfully!");
