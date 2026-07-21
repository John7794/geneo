const fs = require('fs');
const papa = require('papaparse');
const parsed = papa.parse(fs.readFileSync('data/db/uk/familyList.csv', 'utf8'), {header: true});
console.log("Keys:", Object.keys(parsed.data[1]));
console.log("Row 1:", parsed.data[1]);
