const fs = require('fs');
let jsCode = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

// Replace the place where controls are inserted
jsCode = jsCode.replace(/placesSectionContent\.insertAdjacentHTML\('afterbegin', controlsHtml\);/g, `
            const bodyBlocks = this.containerPlaces.querySelector('.events-body-blocks');
            if (bodyBlocks) {
                bodyBlocks.insertAdjacentHTML('afterbegin', controlsHtml);
            } else {
                placesSectionContent.insertAdjacentHTML('afterbegin', controlsHtml);
            }
`);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', jsCode);
