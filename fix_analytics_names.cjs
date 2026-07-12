const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const regex = /container\.innerHTML = sortedEntries\.map\(s => \{[\s\S]*?\}\)\.join\(''\);/g;
const replacement = `
                container.style.display = "flex";
                container.style.flexWrap = "wrap";
                container.style.gap = "8px";
                container.innerHTML = sortedEntries.map(s => {
                    let hasNicknames = includeNicknames && nicknamesMap[s[0]];
                    
                    let html = \`<li style="list-style: none; display: inline-flex; flex-direction: column; background: var(--color-surface); border: 1px solid var(--color-border-light); border-radius: 8px; padding: 4px 12px; font-size: 14px; color: var(--color-text-main);"\>\`;
                    
                    html += \`<div style="display: flex; align-items: center; gap: 6px;">
                        <span>\${s[0]}</span> 
                        <span style="background: var(--color-bg); padding: 2px 6px; border-radius: 12px; font-size: 12px; color: var(--color-text-muted);">\${s[1]}</span>
                    </div>\`;

                    if (hasNicknames) {
                        let sortedNn = [];
                        if (sortMode === 'appearance') {
                            sortedNn = (nicknamesOrder[s[0]] || []).map(k => [k, nicknamesMap[s[0]][k]]);
                        } else if (sortMode === 'alphabet') {
                            sortedNn = Object.entries(nicknamesMap[s[0]]).sort((a, b) => a[0].localeCompare(b[0]));
                        } else if (sortMode === 'frequency') {
                            sortedNn = Object.entries(nicknamesMap[s[0]]).sort((a, b) => b[1] - a[1]);
                        }
                        
                        if (sortedNn.length > 0) {
                            html += \`<div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--color-border-light);">\`;
                            html += sortedNn.map(nn => \`<span style="font-size: 12px; color: var(--color-text-muted);">\${nn[0]} (\${nn[1]})</span>\`).join('');
                            html += \`</div>\`;
                        }
                    }
                    html += \`</li>\`;
                    return html;
                }).join('');
`;

js = js.replace(regex, replacement);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
console.log("Updated names and surnames with tags!");
