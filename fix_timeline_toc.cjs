const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldTocLinks = `let tocLinksHtml = Array.from(tocCenturies).map(c => \`
                        <li>
                            <a href="#timeline-century-\${c}" class="profile-toc-link js-scroll-to">\${getCenturyRoman(c)} \${i18n.t("time.century") || "століття"}</a>
                        </li>
                    \`).join('');`;

const newTocLinks = `let tocLinksHtml = Array.from(tocCenturies).sort((a, b) => b - a).map(c => \`<li><a href="#timeline-century-\${c}" class="profile-toc-link js-scroll-to">\${getCenturyRoman(c)} \${i18n.t("time.century") || "століття"}</a></li>\`).join('');`;

code = code.replace(oldTocLinks, newTocLinks);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
