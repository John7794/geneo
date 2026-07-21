const fs = require('fs');
let jsCode = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

jsCode = jsCode.replace(/const sortControls = timelineList\.previousElementSibling;[\s\n]*timelineList\.parentNode\.insertBefore\(wrapper, sortControls \? sortControls : timelineList\);[\s\n]*wrapper\.appendChild\(sidebar\);[\s\n]*wrapper\.appendChild\(bodyBlocks\);[\s\n]*if \(sortControls && sortControls\.classList\.contains\('analytics-sort-controls'\)\) \{[\s\n]*bodyBlocks\.appendChild\(sortControls\);[\s\n]*\}[\s\n]*bodyBlocks\.appendChild\(timelineList\);/g, `
                        timelineList.parentNode.insertBefore(wrapper, timelineList);
                        wrapper.appendChild(sidebar);
                        wrapper.appendChild(bodyBlocks);
                        bodyBlocks.appendChild(timelineList);
`);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', jsCode);
