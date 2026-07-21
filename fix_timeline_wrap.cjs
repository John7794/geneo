const fs = require('fs');

let jsCode = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

jsCode = jsCode.replace(/timelineList\.parentNode\.insertBefore\(wrapper, timelineList\);[\s\n]*wrapper\.appendChild\(sidebar\);[\s\n]*wrapper\.appendChild\(bodyBlocks\);[\s\n]*bodyBlocks\.appendChild\(timelineList\);/g, `
                        const sortControls = timelineList.previousElementSibling;
                        timelineList.parentNode.insertBefore(wrapper, sortControls ? sortControls : timelineList);
                        wrapper.appendChild(sidebar);
                        wrapper.appendChild(bodyBlocks);
                        if (sortControls && sortControls.classList.contains('analytics-sort-controls')) {
                            bodyBlocks.appendChild(sortControls);
                        }
                        bodyBlocks.appendChild(timelineList);
`);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', jsCode);
