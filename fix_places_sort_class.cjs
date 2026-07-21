const fs = require('fs');
const file = '/app/applet/scripts/components/interaction/analyticsManager.js';
let content = fs.readFileSync(file, 'utf8');

const target = `            const sortContainerPlaces = document.createElement("div");
            sortContainerPlaces.style.display = "flex";
            sortContainerPlaces.style.alignItems = "center";
            sortContainerPlaces.style.marginBottom = "16px";
            sortContainerPlaces.innerHTML = \``;

const replacement = `            const sortContainerPlaces = document.createElement("div");
            sortContainerPlaces.className = "analytics-sort-controls";
            sortContainerPlaces.innerHTML = \``;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log("Restored sticky class to places sort container.");
