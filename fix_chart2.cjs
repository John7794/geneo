const fs = require('fs');

let content = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

content = content.replace(
    /if \(sidebar\) \{\s*sidebar\.style\.display = 'block';/g,
    `if (sidebar) {
                    const isDesktop = window.innerWidth >= 1200;
                    sidebar.style.display = isDesktop ? 'block' : 'none';`
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', content);
