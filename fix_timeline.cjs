const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const strToFind = `// Timeline of events`;
const firstIndex = code.indexOf(strToFind);
const lastIndex = code.lastIndexOf(strToFind);

if (firstIndex !== -1 && lastIndex !== -1 && firstIndex !== lastIndex) {
    // Keep everything up to the second occurrence, actually let's see where the second occurrence ends.
    // The second occurrence was inserted right before "// Coats of arms".
    const endOfSecond = code.indexOf('// Coats of arms', lastIndex);
    if (endOfSecond !== -1) {
        // remove from lastIndex to endOfSecond
        code = code.substring(0, lastIndex) + code.substring(endOfSecond);
        fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
        console.log('Successfully removed duplicated timeline block');
    }
} else {
    console.log('Could not find duplicate blocks.');
}
