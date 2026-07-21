const fs = require('fs');

let content = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

// Update scrubber handle to be sticky
content = content.replace(
    '<div id="timeline-scrubber-handle" style="position: absolute; top: 30px;',
    '<div id="timeline-scrubber-handle" style="position: sticky; top: 30px;'
);

// We need to ensure the scrubber line doesn't extend above the axis if that's an issue.
// Actually, if we make the scrubber's top: 30px, then it won't go into the axis!
// Wait! If the scrubber line is top: 30px, it starts exactly below the axis.
// Let's change the scrubber's top from 0 to 30px.
content = content.replace(
    '<div id="timeline-scrubber" style="position: absolute; top: 0; bottom: 0;',
    '<div id="timeline-scrubber" style="position: absolute; top: 30px; bottom: 0;'
);

// Since scrubber starts at top: 30px, the handle should stick at 30px, but its top relative to scrubber should be 0.
content = content.replace(
    '<div id="timeline-scrubber-handle" style="position: sticky; top: 30px;',
    '<div id="timeline-scrubber-handle" style="position: sticky; top: 30px; margin-top: -30px;'
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', content);
