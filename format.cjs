const fs = require('fs');
let code = fs.readFileSync('server.ts.fixed1', 'utf8');

let fixed = code.replace(/if \(serviceAccount\.private_key\) \{\s*serviceAccount\.private_key = serviceAccount\.private_key\.replace\(\/\\\\n\/g, '\\n'\);\s*adminConfig\.credential = admin\.credential\.cert\(serviceAccount\);\s*console\.log\("Using provided FIREBASE_SERVICE_ACCOUNT for credentials\."\);\s*\} catch \(e: any\) \{/g, 
  `if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\\\n/g, '\\n');
      }
      adminConfig.credential = admin.credential.cert(serviceAccount);
      console.log("Using provided FIREBASE_SERVICE_ACCOUNT for credentials.");
    } catch (e: any) {`);

fixed = fixed.replace(/\} catch \(e: any\) \{\s*res\.status\(500\)\.json\(\{ error: e\.message \}\);\s*\}\);/g, 
  `} catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });`);

fixed = fixed.replace(/createdAt: admin\.firestore\.FieldValue\.serverTimestamp\(\)\s*;\s*console\.log\("\[Invite\] Saving to Firestore\.\.\."\);/g, 
  `createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      console.log("[Invite] Saving to Firestore...");`);
      
// Just fix any remaining bracket issues, let's just dump fixed1 to standard output
fs.writeFileSync('server_test.ts', fixed);
