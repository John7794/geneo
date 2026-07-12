const fs = require('fs');
let ts = fs.readFileSync('server.ts', 'utf8');
ts = ts.replace(
    /textContent = data\.content;\s*const fullLocalPath/g,
    `textContent = data.content;
          }
          const fullLocalPath`
);
ts = ts.replace(
    /count\+\+;\s*console\.log/g,
    `count++;
        }
      }
      console.log`
);
ts = ts.replace(
    /console\.error\("\[Firestore DB\] Failed to restore files from Firestore:", e\);\s*\}/g,
    `console.error("[Firestore DB] Failed to restore files from Firestore:", e);
    }
  }`
);
fs.writeFileSync('server.ts', ts);
console.log("Fixed missing braces in restoreFilesFromFirestore");
