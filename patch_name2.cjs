const fs = require('fs');
const file = 'scripts/components/ui/formatters/name.js';
let content = fs.readFileSync(file, 'utf8');

const startIndex = content.indexOf('const eventType = options.eventType || options;');
const endIndex = content.indexOf('const name = escapeHtml(nameRaw);');

if (startIndex !== -1 && endIndex !== -1) {
    const before = content.substring(0, startIndex);
    const after = content.substring(endIndex);
    
    const newLogic = `const eventType = options.eventType || options; 
	if (["birth", "baptism", "marriage"].includes(eventType)) {
		if (isFem) {
			surnameRaw = person.maidenName ? String(person.maidenName).trim().toUpperCase() : "";
		}
	} else if (["death", "funeral"].includes(eventType)) {
		if (isFem) {
			if (person.marriedName) {
				const mSurnames = person.marriedName.split(/[,;]/).map(x => x.trim()).filter(Boolean);
				if (mSurnames.length > 0) {
					surnameRaw = mSurnames[mSurnames.length - 1].toUpperCase();
				}
			} else {
				surnameRaw = person.maidenName ? String(person.maidenName).trim().toUpperCase() : "";
			}
		}
	} else {
		if (isFem) {
			surnameRaw = person.maidenName ? String(person.maidenName).trim().toUpperCase() : "";
		}
	}

	`;
    
    fs.writeFileSync(file, before + newLogic + after);
    console.log('Patched name.js');
} else {
    console.log('Could not find indices in name.js');
}
