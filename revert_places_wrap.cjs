const fs = require('fs');
let jsCode = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

jsCode = jsCode.replace(/const bodyBlocks = this\.containerPlaces\.querySelector\('\.events-body-blocks'\);[\s\n]*if \(bodyBlocks\) \{[\s\n]*bodyBlocks\.insertAdjacentHTML\('afterbegin', controlsHtml\);[\s\n]*\} else \{[\s\n]*placesSectionContent\.insertAdjacentHTML\('afterbegin', controlsHtml\);[\s\n]*\}/g, `
            placesSectionContent.insertAdjacentHTML('afterbegin', controlsHtml);
`);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', jsCode);
