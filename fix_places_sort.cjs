const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const regex = /        renderPlaces\('frequency'\);\s*const placesSectionContent = this\.containerPlaces\.closest\('\.analytics-section-content'\);\s*if \(placesSectionContent && !placesSectionContent\.querySelector\('\.places-sort-controls'\)\) \{\s*const controlsHtml = `[\s\S]*?`;\s*placesSectionContent\.insertAdjacentHTML\('afterbegin', controlsHtml\);\s*const updatePlacesActiveBtn = \(mode\) => \{[\s\S]*?\};\s*placesSectionContent\.querySelectorAll\('\.btn-sort-places'\)\.forEach\(btn => \{\s*btn\.addEventListener\('click', \(e\) => \{\s*e\.preventDefault\(\);\s*const mode = btn\.dataset\.sort;\s*renderPlaces\(mode\);\s*updatePlacesActiveBtn\(mode\);\s*\}\);\s*\}\);\s*updatePlacesActiveBtn\('frequency'\);\s*\}/m;

const newStr = `        const placesSectionContent = this.containerPlaces.closest('.analytics-section-content');
        let controls = placesSectionContent ? placesSectionContent.querySelector('.places-sort-controls') : null;
        if (placesSectionContent && !controls) {
            const controlsHtml = \`
                <div class="places-sort-controls" style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
                    <button class="btn btn-sm btn-outline btn-sort-places" data-sort="frequency">За популярністю</button>
                    <button class="btn btn-sm btn-outline btn-sort-places" data-sort="appearance">За згадкою</button>
                    <button class="btn btn-sm btn-outline btn-sort-places" data-sort="alphabet_az">А - Я</button>
                    <button class="btn btn-sm btn-outline btn-sort-places" data-sort="alphabet_za">Я - А</button>
                </div>
            \`;
            placesSectionContent.insertAdjacentHTML('afterbegin', controlsHtml);
            controls = placesSectionContent.querySelector('.places-sort-controls');
        }

        let activeSortMode = 'frequency';
        if (controls) {
            controls.querySelectorAll('.btn-sort-places').forEach(btn => {
                if (btn.style.background === 'var(--color-primary)') {
                    activeSortMode = btn.dataset.sort;
                }
            });
        }

        renderPlaces(activeSortMode);

        if (placesSectionContent) {
            const updatePlacesActiveBtn = (mode) => {
                placesSectionContent.querySelectorAll('.btn-sort-places').forEach(btn => {
                    if (btn.dataset.sort === mode) {
                        btn.style.background = 'var(--color-primary)';
                        btn.style.color = 'var(--color-on-primary)';
                        btn.style.borderColor = 'var(--color-primary)';
                    } else {
                        btn.style.background = 'transparent';
                        btn.style.color = 'var(--color-text-main)';
                        btn.style.borderColor = 'var(--color-border)';
                    }
                });
            };

            updatePlacesActiveBtn(activeSortMode);

            placesSectionContent.querySelectorAll('.btn-sort-places').forEach(btn => {
                btn.onclick = (e) => {
                    e.preventDefault();
                    const mode = btn.dataset.sort;
                    renderPlaces(mode);
                    updatePlacesActiveBtn(mode);
                };
            });
        }`;

if (regex.test(code)) {
    code = code.replace(regex, newStr);
    fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
    console.log("Success updating places sort logic");
} else {
    console.log("Failed to find places sort regex");
}
