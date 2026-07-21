const fs = require('fs');
let jsCode = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const declarationBlock = `
		let maleCount = 0;
		let femaleCount = 0;
		let unknownCount = 0;
		let totalPeople = 0;
`;
const newDeclarationBlock = `
		let maleCount = 0;
		let femaleCount = 0;
		let unknownCount = 0;
		let totalPeople = 0;
        let confirmedCount = 0;
        let unconfirmedCount = 0;
        let confirmedMale = 0;
        let confirmedFemale = 0;
        let unconfirmedMale = 0;
        let unconfirmedFemale = 0;
`;

jsCode = jsCode.replace(declarationBlock, newDeclarationBlock);

const loopBlock = `
			if (person.gender === "m" || person.gender === "ч") maleCount++;
			else if (person.gender === "f" || person.gender === "ж") femaleCount++;
			else {
			    // fallback to male if unknown to make sum match, since user said no unknown genders
			    maleCount++; 
			}
`;

const newLoopBlock = `
			if (person.gender === "m" || person.gender === "ч") maleCount++;
			else if (person.gender === "f" || person.gender === "ж") femaleCount++;
			else {
			    // fallback to male if unknown to make sum match, since user said no unknown genders
			    maleCount++; 
			}

            let isConfirmed = false;
            if (person.raw) {
                const rawStatus = String(person.raw[COLUMNS.basic?.status || "status"] || "").trim().toLowerCase();
                isConfirmed = rawStatus === "1" || rawStatus === "confirmed" || rawStatus === "true" || rawStatus === "так" || rawStatus === "+";
            }
            if (isConfirmed) {
                confirmedCount++;
                if (person.gender === "f" || person.gender === "ж") confirmedFemale++;
                else confirmedMale++;
            } else {
                unconfirmedCount++;
                if (person.gender === "f" || person.gender === "ж") unconfirmedFemale++;
                else unconfirmedMale++;
            }
`;

jsCode = jsCode.replace(loopBlock, newLoopBlock);

const renderBlock = `
                    <!-- Загальна кількість -->
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
                        <div style="color: var(--color-text-muted); font-size: 14px; margin-bottom: 12px;">Загальна кількість</div>
                        <div style="font-size: 32px; font-weight: bold; color: var(--color-primary); margin-bottom: 8px;">\${totalPeople}</div>
                        <div style="color: var(--color-text-meta); font-size: 14px; margin-top: 12px;">Чоловіків: \${maleCount} / Жінок: \${femaleCount}</div>
                    </div>
`;

const newRenderBlock = `
                    <!-- Загальна кількість -->
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
                    </div>
`;

jsCode = jsCode.replace(renderBlock, newRenderBlock);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', jsCode);
