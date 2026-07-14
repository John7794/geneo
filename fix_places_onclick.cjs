const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const regex = /btn\.onclick = \(e\) => \{\s*e\.preventDefault\(\);\s*const mode = btn\.dataset\.sort;\s*renderPlaces\(mode\);\s*updatePlacesActiveBtn\(mode\);\s*\};/m;

const newStr = `btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const mode = btn.dataset.sort;
                    renderPlaces(mode);
                    updatePlacesActiveBtn(mode);
                    if (btn.closest('.popup-overlay')) {
                        btn.closest('.popup-overlay').style.display = 'none';
                    }
                });`;

if (regex.test(code)) {
    code = code.replace(regex, newStr);
    fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
    console.log("Success replacing btn.onclick with addEventListener");
} else {
    console.log("Failed to find regex");
}
