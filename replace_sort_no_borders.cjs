const fs = require('fs');
const file = '/app/applet/scripts/components/interaction/analyticsManager.js';
let content = fs.readFileSync(file, 'utf8');

const target2 = `            const sortContainerPlaces = document.createElement("div");
            sortContainerPlaces.className = "analytics-sort-controls";
            sortContainerPlaces.style.borderBottom = "1px solid var(--color-border-light)";
            sortContainerPlaces.style.marginBottom = "24px";
            sortContainerPlaces.innerHTML = \``;

const replacement2 = `            const sortContainerPlaces = document.createElement("div");
            sortContainerPlaces.className = "analytics-sort-controls";
            sortContainerPlaces.innerHTML = \``;

content = content.replace(target2, replacement2);
fs.writeFileSync(file, content);
console.log("Replaced sortContainerPlaces to have NO inline styles!");
