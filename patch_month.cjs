const fs = require('fs');
const file = 'scripts/components/interaction/analyticsManager.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `                        });
                    });
                });
                
                // Close the month blocks
                html = html.replace(/<\\/li>\\s*$/g, ""); // Remove the last closing li if any issues`;

const replacementStr = `                        });
                    });
                    html += \`
                            </div>
                        </li>
                    \`;
                });
                
                // Close the month blocks
                // html = html.replace(/<\\/li>\\s*$/g, ""); // Remove the last closing li if any issues`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(file, content);
console.log('Month patched!');
