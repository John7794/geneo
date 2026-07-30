const fs = require('fs');
let content = fs.readFileSync('./scripts/components/ui/profile/records.js', 'utf8');
content = content.replace(/import \{ resolvePlaceDetails \} from "\.\.\/\.\.\/\.\.\/utils\/geoUtils\.js";\n/g, '');
content = content.replace(/import \{ COLUMNS/g, 'import { resolvePlaceDetails } from "../../../utils/geoUtils.js";\nimport { COLUMNS');
fs.writeFileSync('./scripts/components/ui/profile/records.js', content);
