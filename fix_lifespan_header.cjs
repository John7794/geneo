const fs = require('fs');
let jsCode = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldReturn = `return \`
                <div style="width: 100%;">
                    <div class="analytics-stat-title" style=" font-weight: 600; font-size: 16px; color: var(--color-text-main);">\${title}</div>
                    <div style="display: flex; flex-direction: column; width: 100%; margin-bottom: 32px;">
                        \${rowsHtml}
                    </div>
                </div>
            \`;`;

const newReturn = `return \`
                <div style="width: 100%;">
                    <div style="margin-bottom: 16px; display: flex; align-items: center; width: 100%; padding: 12px 0;">
                        <div style="flex-grow: 1; height: 1px; background: var(--color-border-light);"></div>
                        <div style="margin: 0 16px; font-size: 12px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.5px;">\${title}</div>
                        <div style="flex-grow: 1; height: 1px; background: var(--color-border-light);"></div>
                    </div>
                    <div style="display: flex; flex-direction: column; width: 100%; margin-bottom: 32px;">
                        \${rowsHtml}
                    </div>
                </div>
            \`;`;

jsCode = jsCode.replace(oldReturn, newReturn);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', jsCode);
