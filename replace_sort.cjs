const fs = require('fs');
const file = '/app/applet/scripts/components/interaction/analyticsManager.js';
let content = fs.readFileSync(file, 'utf8');

const target2 = `            const sortContainerPlaces = document.createElement("div");
            sortContainerPlaces.className = "analytics-sort-controls";
            sortContainerPlaces.style.marginBottom = "24px";
            sortContainerPlaces.style.background = "var(--color-bg-card)";
            sortContainerPlaces.style.padding = "12px 16px";
            sortContainerPlaces.style.borderRadius = "12px";
            sortContainerPlaces.style.border = "1px solid var(--color-border)";
            sortContainerPlaces.style.display = "flex";
            sortContainerPlaces.style.alignItems = "center";`;

const replacement2 = `            const sortContainerPlaces = document.createElement("div");
            sortContainerPlaces.className = "analytics-sort-controls";
            sortContainerPlaces.style.borderBottom = "1px solid var(--color-border-light)";
            sortContainerPlaces.style.marginBottom = "24px";`;

content = content.replace(target2, replacement2);
fs.writeFileSync(file, content);
console.log("Replaced sortContainerPlaces!");
