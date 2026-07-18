const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/aiManager.js', 'utf8');

const oldCode = `        let formattedText = text;
        if (!isUser) {`;

const newCode = `        let formattedText = text;
        if (!isUser) {
            formattedText = formattedText.replace(/#/g, '');`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('scripts/components/interaction/aiManager.js', code);
console.log('Fixed # in aiManager.js');
