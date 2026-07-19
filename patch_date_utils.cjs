const fs = require('fs');
let code = fs.readFileSync('scripts/utils/dateUtils.js', 'utf8');

code = code.replace(
    /export function getMonthName\(mIndex\) \{[\s\S]*?\}/,
    `export function getMonthName(mIndex, nominative = false) {
	const key = nominative ? "time.monthsNominative" : "time.monthsGenitive";
	const rawMonths = i18n.t(key);
	let months = Array.isArray(rawMonths) ? rawMonths : [];
	// Fallback to genitive if nominative doesn't exist yet
	if (months.length === 0 && nominative) {
		const genitive = i18n.t("time.monthsGenitive");
		months = Array.isArray(genitive) ? genitive : [];
	}
	const index = parseInt(mIndex, 10);
	return !Number.isNaN(index) && months[index] ? months[index] : "";
}`
);

code = code.replace(
    /export function getEventDateDetails\(d, m, y, isOldStyle = false\) \{[\s\S]*?const monthName = getMonthName\(m\) \|\| m \|\| "";/,
    `export function getEventDateDetails(d, m, y, isOldStyle = false) {
	const day = d || "";
	const year = y || "";
	const isNominative = !day;
	const monthName = getMonthName(m, isNominative) || m || "";`
);

fs.writeFileSync('scripts/utils/dateUtils.js', code);
console.log('Fixed dateUtils');
