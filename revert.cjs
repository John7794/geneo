const fs = require('fs');
let jsCode = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');
const searchStart = "const renderPlaces = (sortMode) => {";
// let's look at git history instead!
