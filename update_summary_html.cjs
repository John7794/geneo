const fs = require('fs');
let jsCode = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldRenderBlock = `                    <!-- Загальна кількість -->
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
                        <div style="color: var(--color-text-muted); font-size: 14px; margin-bottom: 12px;">Загальна кількість</div>
                        <div style="font-size: 32px; font-weight: bold; color: var(--color-primary); margin-bottom: 8px;">\${totalPeople}</div>
                        <div style="color: var(--color-text-meta); font-size: 14px; margin-top: 12px; margin-bottom: 16px;">Чоловіків: \${maleCount} / Жінок: \${femaleCount}</div>
                        
                        <div style="width: 100%; height: 1px; background: var(--color-border-light); margin-bottom: 16px;"></div>
                        
                        <div style="display: flex; width: 100%; justify-content: space-around; font-size: 14px;">
                            <div style="display: flex; flex-direction: column; align-items: center;">
                                <div style="color: var(--color-text-muted); margin-bottom: 4px;">Підтверджені</div>
                                <div style="font-weight: 600; color: var(--color-text-main); font-size: 18px;">\${confirmedCount}</div>
                                <div style="color: var(--color-text-meta); font-size: 12px; margin-top: 4px;">Чоловіків: \${confirmedMale} / Жінок: \${confirmedFemale}</div>
                            </div>
                            <div style="display: flex; flex-direction: column; align-items: center;">
                                <div style="color: var(--color-text-muted); margin-bottom: 4px;">Непідтверджені</div>
                                <div style="font-weight: 600; color: var(--color-text-main); font-size: 18px;">\${unconfirmedCount}</div>
                                <div style="color: var(--color-text-meta); font-size: 12px; margin-top: 4px;">Чоловіків: \${unconfirmedMale} / Жінок: \${unconfirmedFemale}</div>
                            </div>
                        </div>
                    </div>`;

const newRenderBlock = `                    <!-- Загальна кількість -->
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px;" class="analytics-summary-stats">
                        <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
                            <div style="color: var(--color-text-muted); font-size: 14px; margin-bottom: 12px;">Підтверджені</div>
                            <div style="font-size: 24px; font-weight: bold; color: var(--color-text-main); margin-bottom: 8px;">\${confirmedCount}</div>
                            <div style="color: var(--color-text-meta); font-size: 12px; margin-top: 4px;">Чоловіків: \${confirmedMale} / Жінок: \${confirmedFemale}</div>
                        </div>
                        
                        <div class="analytics-summary-stats-divider"></div>

                        <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
                            <div style="color: var(--color-text-muted); font-size: 14px; margin-bottom: 12px;">Загальна кількість</div>
                            <div style="font-size: 32px; font-weight: bold; color: var(--color-primary); margin-bottom: 8px;">\${totalPeople}</div>
                            <div style="color: var(--color-text-meta); font-size: 14px; margin-top: 4px;">Чоловіків: \${maleCount} / Жінок: \${femaleCount}</div>
                        </div>

                        <div class="analytics-summary-stats-divider"></div>
                        
                        <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
                            <div style="color: var(--color-text-muted); font-size: 14px; margin-bottom: 12px;">Непідтверджені</div>
                            <div style="font-size: 24px; font-weight: bold; color: var(--color-text-main); margin-bottom: 8px;">\${unconfirmedCount}</div>
                            <div style="color: var(--color-text-meta); font-size: 12px; margin-top: 4px;">Чоловіків: \${unconfirmedMale} / Жінок: \${unconfirmedFemale}</div>
                        </div>
                    </div>`;

if (jsCode.includes(oldRenderBlock)) {
    jsCode = jsCode.replace(oldRenderBlock, newRenderBlock);
    fs.writeFileSync('scripts/components/interaction/analyticsManager.js', jsCode);
    console.log("Success");
} else {
    console.log("Not found");
}
