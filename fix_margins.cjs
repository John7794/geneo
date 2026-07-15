const fs = require('fs');
let code = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

code = code.replace(/\.analytics-body \{[\s\S]*?\}/, `.analytics-body {
    padding: 16px;
}
@media (min-width: 768px) {
    .analytics-body {
        padding: 24px;
    }
}`);

// Fix margin -20px logic since padding is now 16px or 24px!
// It's better to NOT use margin -20px, but rather apply padding to the content or just set the header to full width.
// Actually, let's keep margin: -16px for mobile and -24px for desktop, OR just use background stretching!
// We already use ::before to stretch the background, so we don't NEED negative margins to stretch the background. We only need negative margins if we want the content to stretch.
