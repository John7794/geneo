const fs = require('fs');
let jsCode = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldBlock = `                    header.addEventListener('click', () => {
                    if (window.innerWidth >= 1200) return;
                    const isOpen = body.style.display === 'block';`;

const newBlock = `                    header.addEventListener('click', () => {
                    const isOpen = body.style.display === 'block';`;

if (jsCode.includes(oldBlock)) {
    jsCode = jsCode.replace(oldBlock, newBlock);
    fs.writeFileSync('scripts/components/interaction/analyticsManager.js', jsCode);
    console.log("Success");
} else {
    console.log("Not found");
}
