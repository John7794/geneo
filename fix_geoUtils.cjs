const fs = require('fs');
let js = fs.readFileSync('scripts/utils/geoUtils.js', 'utf8');

js = js.replace(
    'if (DB?.geoIndexes?.places && DB.geoIndexes.places[cleanPlaceId]) {\\n\\t\\tplaceObj = DB.geoIndexes.places[cleanPlaceId];',
    'if (ctx?.geoIndexes?.places && ctx.geoIndexes.places[cleanPlaceId]) {\\n\\t\\tplaceObj = ctx.geoIndexes.places[cleanPlaceId];\\n\\t} else if (DB?.geoIndexes?.places && DB.geoIndexes.places[cleanPlaceId]) {\\n\\t\\tplaceObj = DB.geoIndexes.places[cleanPlaceId];'
);

// Also trim the DB places check
js = js.replace(
    'p[COLUMNS.places?.id || "place_id"] === cleanPlaceId',
    'String(p[COLUMNS.places?.id || "place_id"] || "").trim() === cleanPlaceId'
);

fs.writeFileSync('scripts/utils/geoUtils.js', js);
console.log("Fixed geoUtils");
