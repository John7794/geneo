const { execSync } = require('child_process');
try {
  console.log(execSync('git diff --name-only HEAD').toString());
} catch(e) {
  console.error(e.message);
}
