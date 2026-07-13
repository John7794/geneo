const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const regexRenderPlaces = /this\.containerPlaces\.style\.flexDirection = "column";[\s\S]*?`\}\)\.join\(""\);/s;

const newRenderPlaces = `
        this.containerPlaces.style.display = "flex";
        this.containerPlaces.style.flexWrap = "wrap";
        this.containerPlaces.style.gap = "8px";
        this.containerPlaces.style.flexDirection = "row";
        
        this.containerPlaces.innerHTML = topPlaces.map(p => {
            const placeId = p[0];
            const placeName = placeNameMap[placeId] || "Невідоме місце (" + placeId + ")";
            const total = p[1].total;
            const eventsObj = p[1].events;
            
            return \`
            <li style="list-style: none; display: inline-flex; flex-direction: column; background: var(--color-bg-card); border: 1px solid var(--color-border-light); border-radius: 8px; padding: 4px 12px; font-size: 14px; color: var(--color-text-main);">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span>\${placeName}</span>
                    <span style="background: var(--color-bg-body); padding: 2px 6px; border-radius: 12px; font-size: 12px; color: var(--color-text-muted);">\${total} \${getEventWord(total)}</span>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--color-border-light);">
                    \${Object.entries(eventsObj).map(e => \`<span style="font-size: 12px; color: var(--color-text-muted);">\${e[0]} (\${e[1]})</span>\`).join("")}
                </div>
            </li>
        \`}).join("");
`;

if (js.includes('this.containerPlaces.style.flexDirection = "column";')) {
    js = js.replace(regexRenderPlaces, newRenderPlaces);
    fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
    console.log("Reverted places to inline flex and counts only");
} else {
    console.log("Could not find regex");
}
