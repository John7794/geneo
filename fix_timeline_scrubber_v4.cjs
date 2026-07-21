const fs = require('fs');

let content = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

// Move the scrubber handle up by 30px so it sits inside the axis, since the scrubber line starts at top: 30px.
content = content.replace(
    '<div id="timeline-scrubber-handle" style="position: absolute; top: 0px;',
    '<div id="timeline-scrubber-handle" style="position: absolute; top: -30px;'
);

// Actually, in the axis, the handle is height 30px, so top: -30px places it exactly in the 0-30px area!
// The scrubber line itself is width 2px, height 100vh.
// Since chartContainer has overflow: auto, the 100vh height will make the scrollable area at least 100vh tall!
// This is bad, because if the content is short, it will still have a huge scrollbar.
// Can we fix the scrubber line height?
// We can use height: calc(100% - 30px) if the sticky axis had the full height. But it doesn't.
// We can use bottom: -100vh, but it still expands the scroll area.
// But wait! If chartContainer has overflow-y: auto, we can just give the scrubber line a high z-index and put it back in the relative container?
// No, the whole point was to make the handle sticky.
// Wait! If we put the handle inside the axis, we can put the scrubber line BACK into the relative container!
// Let's do that! Split them!
// Scrubber handle goes into axisHtml.
// Scrubber line goes into relative container!
content = content.replace(
    /const scrubberHtml = \`[\s\S]*?<\/div>\s*<\/div>\s*\`;/,
    `
    const scrubberHandleHtml = \`
        <div id="timeline-scrubber-handle" style="position: absolute; top: 0; left: \${yearToPx(maxYear)}px; margin-left: -14px; width: 30px; height: 30px; background: var(--color-primary); border-radius: 50%; color: white; font-size: 10px; font-weight: bold; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); user-select: none; cursor: ew-resize;">
            \${maxYear}
        </div>
    \`;
    const scrubberLineHtml = \`
        <div id="timeline-scrubber" style="position: absolute; top: 0; bottom: 0; left: \${yearToPx(maxYear)}px; width: 2px; background: var(--color-primary); z-index: 50; cursor: ew-resize; pointer-events: none;">
        </div>
    \`;
    `
);

content = content.replace(
    /axisHtml \+= scrubberHtml \+ '<\/div>';/,
    'axisHtml += scrubberHandleHtml + "</div>";'
);

content = content.replace(
    '<div style="position: relative;">',
    '<div style="position: relative;" id="analytics-timeline-rows-container">'
);

// We need to add the scrubberLineHtml to the innerHTML of chartContainer
content = content.replace(
    /\$\{rowsHtml\}/,
    '${rowsHtml}\n                            ${typeof scrubberLineHtml !== "undefined" ? scrubberLineHtml : ""}'
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', content);
