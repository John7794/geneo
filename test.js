global.localStorage = { setItem: () => {}, getItem: () => {} };
import { generateRelationshipLabel } from './scripts/utils/kinshipUtils.js';

// mock i18n
global.i18n = {
	t: (key) => null
};

console.log("7, 1:", generateRelationshipLabel(7, 1, 'm'));
console.log("1, 7:", generateRelationshipLabel(1, 7, 'm'));
