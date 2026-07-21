const fs = require('fs');
let js = fs.readFileSync('scripts/components/ui/shared/personTile.js', 'utf8');

js = js.replace(/<div class="\$\{UI_CLASSES\.kinshipCardRoleLabel\}" title="\$\{roleLabel\}">\$\{roleLabel\}<\/div>/g, 
                '<div class="${UI_CLASSES.kinshipCardRoleLabel}" title="${roleLabel}">${roleLabel}${options.showId && safeId ? ` <span style="font-size: 0.85em; opacity: 0.7;">(${safeId})</span>` : \'\'}</div>');

fs.writeFileSync('scripts/components/ui/shared/personTile.js', js);
