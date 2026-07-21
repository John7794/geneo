const fs = require('fs');
const file = '/app/applet/scripts/components/interaction/analyticsManager.js';
let content = fs.readFileSync(file, 'utf8');

const target = `            const sortContainerPlaces = document.createElement("div");
            sortContainerPlaces.className = "analytics-sort-controls";
            sortContainerPlaces.style.background = "transparent";
            sortContainerPlaces.style.padding = "0";
            sortContainerPlaces.style.margin = "0 0 16px 0";`;

const replacement = `            const sortContainerPlaces = document.createElement("div");
            sortContainerPlaces.style.display = "flex";
            sortContainerPlaces.style.alignItems = "center";
            sortContainerPlaces.style.marginBottom = "16px";`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log("Fixed places sort container to match Surnames perfectly without sticky controls class.");
