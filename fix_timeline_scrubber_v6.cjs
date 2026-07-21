const fs = require('fs');

let content = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

content = content.replace(
    'scrubber.style.left = `${x}px`;',
    'scrubber.style.left = `${x}px`;\n                            if (scrubberHandle) scrubberHandle.style.left = `${x}px`;'
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', content);
