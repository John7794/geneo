import fs from 'fs';
const text = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');
console.log(text.includes('this.containerPlaces.innerHTML = '));
