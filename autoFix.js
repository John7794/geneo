const fs = require('fs');
const { execSync } = require('child_process');

let code = fs.readFileSync('server.ts', 'utf8').split('\n');

for (let attempt = 0; attempt < 50; attempt++) {
    try {
        execSync('npx tsc --noEmit server.ts', { stdio: 'pipe' });
        console.log("No more errors!");
        break;
    } catch (err) {
        const output = err.stdout.toString();
        const lines = output.split('\n');
        let fixed = false;
        
        // Only fix the FIRST error in the file to avoid line number shifting
        for (const line of lines) {
            const match = line.match(/server\.ts\((\d+),\d+\): error TS1005: 'try' expected./);
            if (match) {
                const lineNum = parseInt(match[1], 10) - 1;
                // Insert "    }" right before the catch
                code.splice(lineNum, 0, '    }');
                fs.writeFileSync('server.ts', code.join('\n'));
                fixed = true;
                break;
            }
            
            const match2 = line.match(/server\.ts\((\d+),\d+\): error TS1128: Declaration or statement expected./);
            if (match2) {
                const lineNum = parseInt(match2[1], 10) - 1;
                code.splice(lineNum, 0, '    }');
                fs.writeFileSync('server.ts', code.join('\n'));
                fixed = true;
                break;
            }
            
            const match3 = line.match(/server\.ts\((\d+),\d+\): error TS1136: Property assignment expected./);
            if (match3) {
                const lineNum = parseInt(match3[1], 10) - 1;
                code.splice(lineNum, 0, '    }');
                fs.writeFileSync('server.ts', code.join('\n'));
                fixed = true;
                break;
            }

            const match4 = line.match(/server\.ts\((\d+),\d+\): error TS1005: ',' expected./);
            if (match4) {
                const lineNum = parseInt(match4[1], 10) - 1;
                code.splice(lineNum, 0, '    }');
                fs.writeFileSync('server.ts', code.join('\n'));
                fixed = true;
                break;
            }
        }
        if (!fixed) {
            console.log("Could not auto-fix:", output);
            break;
        }
    }
}
