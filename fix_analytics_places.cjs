const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const regex = /this\.containerPlaces\.innerHTML = topPlaces\.map\(p => \{[\s\S]*?\}\)\.join\(""\);/g;
const replacement = `
		this.containerPlaces.style.display = "flex";
		this.containerPlaces.style.flexWrap = "wrap";
		this.containerPlaces.style.gap = "8px";
		this.containerPlaces.innerHTML = topPlaces.map(p => {
            const total = p[1].total;
            const eventsObj = p[1].events;
            
            return \`
            <li style="list-style: none; display: inline-flex; flex-direction: column; background: var(--color-surface); border: 1px solid var(--color-border-light); border-radius: 8px; padding: 4px 12px; font-size: 14px; color: var(--color-text-main);">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span>\${placeNameMap[p[0]] || "Невідоме місце (" + p[0] + ")"}</span>
                    <span style="background: var(--color-bg); padding: 2px 6px; border-radius: 12px; font-size: 12px; color: var(--color-text-muted);">\${total} \${getEventWord(total)}</span>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--color-border-light);">
                    \${Object.entries(eventsObj).map(e => \`<span style="font-size: 12px; color: var(--color-text-muted);">\${e[0]} (\${e[1]})</span>\`).join("")}
                </div>
            </li>
        \`}).join("");
`;

js = js.replace(regex, replacement);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
console.log("Updated places with tags!");
