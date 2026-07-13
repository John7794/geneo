const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const newRender = `	render() {
        try {
		    this.calculateStats();
        } catch (e) {
            if (this.containerSummary) {
                this.containerSummary.innerHTML = '<div style="color:red; font-size:20px;">ERROR: ' + e.message + '<br>' + e.stack + '</div>';
            }
        }
	}`;

js = js.replace(/	render\(\) \{\s*this\.calculateStats\(\);\s*\}/, newRender);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
console.log("Patched render to show errors.");
