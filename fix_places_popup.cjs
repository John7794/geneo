const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const regex = /<div class="places-sort-controls" style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">[\s\S]*?<\/div>/m;

const newStr = `<div class="places-sort-controls analytics-sort-controls">
                    <div class="analytics-sort-desktop" style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="frequency">За популярністю</button>
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="appearance">За згадкою</button>
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="alphabet_az">А - Я</button>
                        <button class="btn btn-sm btn-outline btn-sort-places" data-sort="alphabet_za">Я - А</button>
                    </div>
                    <div class="analytics-sort-mobile" style="display: none; margin-bottom: 16px;">
                        <button class="btn btn-sm btn-outline w-full" id="btn-mobile-sort-places" onclick="document.getElementById('mobile-sort-popup-places').style.display='flex'">
                            <i class="ri-sort-desc"></i> Сортувати населені пункти
                        </button>
                    </div>
                    <div id="mobile-sort-popup-places" class="popup-overlay" style="display: none; z-index: 9999;" onclick="if(event.target===this) this.style.display='none'">
                        <div class="popup-content" style="max-width: 300px; width: 90%; margin: auto; padding: 24px; border-radius: 12px; background: var(--color-bg-card); display: flex; flex-direction: column; gap: 12px;">
                            <h3 style="margin-top: 0; margin-bottom: 8px; font-size: 18px;">Сортувати за</h3>
                            <button class="btn btn-outline btn-sort-places" data-sort="frequency" onclick="document.getElementById('mobile-sort-popup-places').style.display='none'">За популярністю</button>
                            <button class="btn btn-outline btn-sort-places" data-sort="appearance" onclick="document.getElementById('mobile-sort-popup-places').style.display='none'">За згадкою</button>
                            <button class="btn btn-outline btn-sort-places" data-sort="alphabet_az" onclick="document.getElementById('mobile-sort-popup-places').style.display='none'">А - Я</button>
                            <button class="btn btn-outline btn-sort-places" data-sort="alphabet_za" onclick="document.getElementById('mobile-sort-popup-places').style.display='none'">Я - А</button>
                            <button class="btn btn-primary mt-2" onclick="document.getElementById('mobile-sort-popup-places').style.display='none'">Закрити</button>
                        </div>
                    </div>
                </div>`;

if (regex.test(code)) {
    code = code.replace(regex, newStr);
    fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
    console.log("Success replacing places sort with responsive popup");
} else {
    console.log("Failed to find regex");
}
