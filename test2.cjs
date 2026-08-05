const fs = require('fs');

const content = fs.readFileSync('./scripts/utils/kinshipUtils.js', 'utf8');

// extract the body of generateRelationshipLabel
const start = content.indexOf('export function generateRelationshipLabel');
const end = content.indexOf('export function getKinshipColumns');
const fnString = content.substring(start, end).replace('export ', '');

const script = `
const i18n = { t: () => null };
function isFemale(g) { return g === 'f'; }
function isMale(g) { return g === 'm'; }
${fnString}
console.log("7, 1 (m):", generateRelationshipLabel(7, 1, 'm'));
console.log("1, 7 (m):", generateRelationshipLabel(1, 7, 'm'));
console.log("7, 1 (f):", generateRelationshipLabel(7, 1, 'f'));
console.log("1, 7 (f):", generateRelationshipLabel(1, 7, 'f'));
`;

fs.writeFileSync('test_run.js', script);
