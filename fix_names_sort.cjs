const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const regex = /        renderNamesM\('appearance'\);\s*renderNamesF\('appearance'\);\s*renderSurnames\('frequency'\);/m;

const newStr = `        let activeNamesSort = 'appearance';
        document.querySelectorAll('.btn-sort-app, .btn-sort-alpha, .btn-sort-freq').forEach(btn => {
            if (btn.style.background === 'var(--color-primary)') {
                if (btn.classList.contains('btn-sort-app')) activeNamesSort = 'appearance';
                else if (btn.classList.contains('btn-sort-alpha')) activeNamesSort = 'alphabet';
                else if (btn.classList.contains('btn-sort-freq')) activeNamesSort = 'frequency';
            }
        });
        
        let activeSurnamesSort = 'frequency'; // Assuming this was intended, although later it says appearance
        document.querySelectorAll('.btn-sort-app-s, .btn-sort-alpha-s, .btn-sort-freq-s').forEach(btn => {
            if (btn.style.background === 'var(--color-primary)') {
                if (btn.classList.contains('btn-sort-app-s')) activeSurnamesSort = 'appearance';
                else if (btn.classList.contains('btn-sort-alpha-s')) activeSurnamesSort = 'alphabet';
                else if (btn.classList.contains('btn-sort-freq-s')) activeSurnamesSort = 'frequency';
            }
        });

        renderNamesM(activeNamesSort);
        renderNamesF(activeNamesSort);
        renderSurnames(activeSurnamesSort);`;

if (regex.test(code)) {
    code = code.replace(regex, newStr);
    
    // Also fix updateNamesActiveBtn('appearance') -> activeNamesSort
    code = code.replace(/updateNamesActiveBtn\('appearance'\); \/\/ initial state/, "updateNamesActiveBtn(activeNamesSort);");
    
    // Also fix updateSurnamesActiveBtn('appearance') -> activeSurnamesSort
    code = code.replace(/updateSurnamesActiveBtn\('appearance'\); \/\/ initial state/, "updateSurnamesActiveBtn(activeSurnamesSort);");

    fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
    console.log("Success updating names sort logic");
} else {
    console.log("Failed to find names sort regex");
}
