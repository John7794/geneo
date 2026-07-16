const fs = require('fs');
const file = 'scripts/utils/personUtils.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `		maidenName:
			nameInfo?.[COLUMNS.names?.bSurname || "bSurname"] ||
			nameInfo?.bSurname ||
			nameInfo?.b_surname ||
			nameInfo?.b_surnames ||
			"",`;

const replacementStr = `		maidenName:
			nameInfo?.[COLUMNS.names?.bSurname || "bSurname"] ||
			nameInfo?.bSurname ||
			nameInfo?.b_surname ||
			nameInfo?.b_surnames ||
			"",
		marriedName:
			nameInfo?.[COLUMNS.names?.mSurname || "mSurname"] ||
			nameInfo?.mSurname ||
			nameInfo?.m_surname ||
			"";`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(file, content);
console.log('personUtils patched!');
