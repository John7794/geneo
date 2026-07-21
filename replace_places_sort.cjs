const fs = require('fs');
const file = '/app/applet/scripts/components/interaction/analyticsManager.js';
let content = fs.readFileSync(file, 'utf8');

const target = `            const sortContainerPlaces = document.createElement("div");
            sortContainerPlaces.className = "analytics-sort-controls";
            sortContainerPlaces.innerHTML = \`
                    <div class="analytics-sort-desktop" style="display: flex; gap: 8px; width: 100%; align-items: center;">
                        <span style="font-size: 14px; font-weight: 500; color: var(--color-text-main); margin-right: auto; display: flex; align-items: center;">Сортувати за:</span>
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="frequency">За популярністю</button>
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="appearance">За згадкою</button>
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="alphabet_az">А - Я</button>
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="alphabet_za">Я - А</button>
                    </div>`;

const replacement = `            const sortContainerPlaces = document.createElement("div");
            sortContainerPlaces.className = "analytics-sort-controls";
            sortContainerPlaces.style.background = "transparent";
            sortContainerPlaces.style.padding = "0";
            sortContainerPlaces.style.margin = "0 0 16px 0";
            sortContainerPlaces.innerHTML = \`
                    <div class="analytics-sort-desktop" style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="appearance">За згадкою</button>
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="alphabet_az">А - Я</button>
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="alphabet_za">Я - А</button>
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="frequency">За популярністю</button>
                    </div>`;

content = content.replace(target, replacement);

const target2 = `            const activeSort = window.app?.managers?.analytics?.currentPlaceSort || 'alphabet_az'; // default to something
            this.containerPlaces.querySelectorAll('.btn-sort-places').forEach(btn => {
                if (btn.dataset.sort === activeSort) {
                    btn.classList.add('active');
                    btn.style.background = 'var(--color-bg-hover)';
                }
            });`;

const replacement2 = `            const activeSort = window.app?.managers?.analytics?.currentPlaceSort || 'alphabet_az'; // default to something
            this.containerPlaces.querySelectorAll('.btn-sort-places').forEach(btn => {
                if (btn.dataset.sort === activeSort) {
                    btn.style.background = 'var(--color-primary)';
                    btn.style.color = 'white';
                    btn.style.borderColor = 'var(--color-primary)';
                } else {
                    btn.style.background = 'transparent';
                    btn.style.color = 'var(--color-text-main)';
                    btn.style.borderColor = 'var(--color-border)';
                }
            });`;

content = content.replace(target2, replacement2);

const target3 = `                        this.containerPlaces.querySelectorAll('.btn-sort-places').forEach(b => {
                            b.classList.remove('active');
                            b.style.background = '';
                        });
                        if (e.currentTarget.classList.contains('btn-sort-places')) {
                            e.currentTarget.classList.add('active');
                            e.currentTarget.style.background = 'var(--color-bg-hover)';
                        }`;

const replacement3 = `                        this.containerPlaces.querySelectorAll('.btn-sort-places').forEach(b => {
                            if (b.dataset.sort === sortMode) {
                                b.style.background = 'var(--color-primary)';
                                b.style.color = 'white';
                                b.style.borderColor = 'var(--color-primary)';
                            } else {
                                b.style.background = 'transparent';
                                b.style.color = 'var(--color-text-main)';
                                b.style.borderColor = 'var(--color-border)';
                            }
                        });`;

content = content.replace(target3, replacement3);

fs.writeFileSync(file, content);
console.log("Replaced places sort styling!");
