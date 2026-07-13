const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const regex = /<a href="#" onclick="event\.preventDefault\(\); if\(window\.app && window\.app\.navigateToId\) \{ window\.app\.navigateToId\('\$\{obj\.id\}', false, 'profile'\); \}" style="position: relative; display: flex; align-items: center; background: var\(--color-bg-body\); border-radius: 8px; text-decoration: none; color: var\(--color-text-main\); font-size: 14px; gap: 8px; transition: opacity 0\.2s; width: \$\{Math\.max\(10, widthPercent\)\}%; min-width: max-content; overflow: hidden; border: 1px solid var\(--color-border\);" onmouseover="this\.style\.opacity='0\.8'" onmouseout="this\.style\.opacity='1'">\s*<div style="position: absolute; top: 0; left: 0; height: 100%; width: 100%; background: var\(--color-bg-card\); z-index: 0; opacity: 0\.5;"><\/div>\s*<div style="position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; padding: 6px 16px 6px 6px; width: 100%;">\s*\$\{avatarHtml\}\s*<span style="font-weight: 500; white-space: nowrap;">\$\{shortName\}<\/span>\s*<span style="margin-left: auto; color: var\(--color-text-meta\); font-size: 12px; font-weight: bold; background: var\(--color-bg-body\); padding: 2px 8px; border-radius: 12px;">\$\{displayAge\}<\/span>\s*<\/div>\s*<\/a>/s;

if (!regex.test(js)) {
    console.log("Regex did not match.");
    process.exit(1);
}

const replacement = `<a href="#" onclick="event.preventDefault(); if(window.app && window.app.navigateToId) { window.app.navigateToId('\${obj.id}', false, 'profile'); }" style="position: relative; display: flex; align-items: center; background: var(--color-bg-body); border-radius: 8px; text-decoration: none; color: var(--color-text-main); font-size: 14px; transition: opacity 0.2s; width: 100%; overflow: hidden; border: 1px solid var(--color-border);" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                        <div style="position: absolute; top: 0; left: 0; height: 100%; width: \${widthPercent}%; background: var(--color-bg-card); z-index: 0; border-right: 2px solid var(--color-primary); opacity: 0.8; transition: width 0.5s ease-in-out;"></div>
                        <div style="position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; padding: 6px 16px 6px 6px; width: 100%;">
                            \${avatarHtml}
                            <span style="font-weight: 500; white-space: nowrap;">\${shortName}</span>
                            <span style="margin-left: auto; color: var(--color-text-meta); font-size: 12px; font-weight: bold; background: var(--color-bg-body); padding: 2px 8px; border-radius: 12px;">\${displayAge}</span>
                        </div>
                    </a>`;

js = js.replace(regex, replacement);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
console.log("Success updated bars");
