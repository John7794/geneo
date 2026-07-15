const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const regex = /<div id="detailed-view-header" style="[^"]*">/m;
const newStr = `<div id="detailed-view-header" class="detailed-view-header">`;

if (regex.test(code)) {
    code = code.replace(regex, newStr);
    fs.writeFileSync('index.html', code);
    console.log("Success updating html");
} else {
    console.log("Failed to find regex");
}
