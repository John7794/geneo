const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Remove the toggle button
html = html.replace(/<div style="display: flex; justify-content: center; margin: 20px 0;">\s*<button id="btn-toggle-analytics-details".*?<\/button>\s*<\/div>/g, '');

// Remove the display:none from detailed-view
html = html.replace(/<div id="analytics-detailed-view" style="display: none;/g, '<div id="analytics-detailed-view" style="display: flex;');

fs.writeFileSync('index.html', html);
console.log("HTML fixed.");
