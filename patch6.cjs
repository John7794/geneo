const fs = require('fs');
const content = fs.readFileSync('./scripts/utils/recordUtils.js', 'utf8');

const searchStr = `			// Автоматичне групування (суміщення) багатосторінкових записів або їх дублікатів в одну плитку.
			// Зводимо ID виду rec_1336_d-1, rec_12_m-1, або rec_192_r_4-1 до базового ID (rec_1336_d, rec_12_m, rec_192_r_4)
			const baseMatch = recId.match(/^(rec_[a-z0-9_]+?)(-\\d+)?$/i);
			if (baseMatch) {
				recId = baseMatch[1];
			}`;

const replaceStr = ``;

fs.writeFileSync('./scripts/utils/recordUtils.js', content.replace(searchStr, replaceStr));
