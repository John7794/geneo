const fs = require('fs');

let content = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

// First, revert any test modifications we did to the scrubber
content = content.replace(
    '<div id="timeline-scrubber" style="position: absolute; top: 30px; bottom: 0;',
    '<div id="timeline-scrubber" style="position: absolute; top: 0; bottom: 0;'
);

content = content.replace(
    '<div id="timeline-scrubber-handle" style="position: sticky; top: 30px; margin-top: -30px; left: -14px; width: 30px; height: 30px; background: var(--color-primary); border-radius: 50%; color: white; font-size: 10px; font-weight: bold; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); user-select: none;">',
    '<div id="timeline-scrubber-handle" style="position: sticky; top: 30px; left: -14px; width: 30px; height: 30px; background: var(--color-primary); border-radius: 50%; color: white; font-size: 10px; font-weight: bold; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); user-select: none; z-index: 101;">'
);

// We need to ensure that the axis HTML has a solid background that covers everything behind it.
// We previously had: let axisHtml = '<div style="position: sticky; top: 0; height: 30px; border-bottom: 1px solid var(--color-border); z-index: 100; background-color: var(--color-bg-card);">';
// Let's make sure it covers the padding too by setting top to 0.
content = content.replace(
    'let axisHtml = \'<div style="position: sticky; top: 0; height: 30px; border-bottom: 1px solid var(--color-border); z-index: 100; background-color: var(--color-bg-card);">\';',
    'let axisHtml = \'<div style="position: sticky; top: 0; height: 30px; border-bottom: 1px solid var(--color-border); z-index: 100; background-color: var(--color-bg-card); margin-top: -16px; padding-top: 16px;">\';'
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', content);
