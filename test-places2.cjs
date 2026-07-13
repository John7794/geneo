const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

js = js.replace('const placeNameMap = {};', 'console.log("places rows:", this.engine?.db?.places?.length); const placeNameMap = {};');
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
