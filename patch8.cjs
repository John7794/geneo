const fs = require('fs');
const content = fs.readFileSync('./scripts/utils/recordUtils.js', 'utf8');

const searchStr = `export function mergeMultipageRecords(rawRecords) {`;
const replaceStr = `export function mergeMultipageRecords(rawRecords) {
	// Bypass merging completely as requested by user (one row = one tile)
	return rawRecords;
`;

fs.writeFileSync('./scripts/utils/recordUtils.js', content.replace(searchStr, replaceStr));
