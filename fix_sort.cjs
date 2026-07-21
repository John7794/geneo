const fs = require('fs');
let content = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

content = content.replace(
    /validPeople\.sort\(\(a, b\) => \{[\s\S]*?return aY - bY;\n\s*\}\);/,
    `validPeople.sort((a, b) => {
                    const aY = a.birth !== null ? a.birth : (a.death - 70);
                    const bY = b.birth !== null ? b.birth : (b.death - 70);
                    return sortDesc ? (bY - aY) : (aY - bY);
                });`
);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', content);
