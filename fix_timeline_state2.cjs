const fs = require('fs');

let content = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const target1 = `let timelineViewMode = "list";`;
            
const replacement1 = `if (!this.timelineViewMode) {
                this.timelineViewMode = "list";
            }
            let timelineViewMode = this.timelineViewMode;`;

content = content.replace(target1, replacement1);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', content);
