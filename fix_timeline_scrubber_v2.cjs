const fs = require('fs');

let content = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

// 1. Remove the old scrubberHtml from the script
content = content.replace(
    /const scrubberHtml = \`[\s\S]*?<\/div>\s*<\/div>\s*\`;/,
    'const scrubberHtml = "";'
);

// 2. Remove it from the innerHTML injection
content = content.replace(
    /\$\{scrubberHtml\}/,
    ''
);

// 3. Add the scrubber directly into axisHtml, so it becomes sticky with the axis.
// We'll set its height to 200vh so it extends down the whole page.
content = content.replace(
    /axisHtml \+= '<\/div>';/,
    `
    const scrubberHtml = \`
        <div id="timeline-scrubber" style="position: absolute; top: 30px; left: \${yearToPx(maxYear)}px; width: 2px; height: 100vh; background: var(--color-primary); z-index: 50; cursor: ew-resize;">
            <div id="timeline-scrubber-handle" style="position: absolute; top: 0px; left: -14px; width: 30px; height: 30px; background: var(--color-primary); border-radius: 50%; color: white; font-size: 10px; font-weight: bold; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); user-select: none;">
                \${maxYear}
            </div>
        </div>
    \`;
    axisHtml += scrubberHtml + '</div>';
    `
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', content);
