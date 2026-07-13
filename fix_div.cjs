const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(`<!-- Religions -->
                        </div>
						

						<!-- Coats of arms -->
						<div class="analytics-section">
<h4>Герби</h4>
<div class="analytics-section-content">
<ul id="analytics-coats" class="analytics-coats-grid"></ul>
</div>
</div>
					</div>`, `<!-- Religions -->
						

						<!-- Coats of arms -->
						<div class="analytics-section">
<h4>Герби</h4>
<div class="analytics-section-content">
<ul id="analytics-coats" class="analytics-coats-grid"></ul>
</div>
</div>
                        </div>
					</div>`);
fs.writeFileSync('index.html', html);
