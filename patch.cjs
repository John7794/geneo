const fs = require('fs');
const content = fs.readFileSync('./scripts/utils/recordUtils.js', 'utf8');
const searchStr = `			// Злиття шифрів справ (без дублювання однакових)`;
const replaceStr = `			// Злиття зовнішніх посилань (без дублювання)
			const linkKey = COLUMNS.records?.externalLink || "external_link";
			const newLink = String(record[linkKey] || "").trim();
			if (newLink) {
				const currentLink = String(existing[linkKey] || "").trim();
				if (!currentLink) {
					existing[linkKey] = newLink;
				} else if (!currentLink.includes(newLink)) {
					existing[linkKey] = \`\${currentLink};\${newLink}\`;
				}
			}

			// Злиття шифрів справ (без дублювання однакових)`;
fs.writeFileSync('./scripts/utils/recordUtils.js', content.replace(searchStr, replaceStr));
