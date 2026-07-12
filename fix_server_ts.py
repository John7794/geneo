import re
with open('server.ts', 'r') as f:
    ts = f.read()

# I will just write a custom script to fix it
old = """      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\\\n/g, '\\n');
        adminConfig.credential = admin.credential.cert(serviceAccount);
      console.log("Using provided FIREBASE_SERVICE_ACCOUNT for credentials.");
    } catch (e: any) {"""

new = """      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\\\n/g, '\\n');
      }
      adminConfig.credential = admin.credential.cert(serviceAccount);
      console.log("Using provided FIREBASE_SERVICE_ACCOUNT for credentials.");
    } catch (e: any) {"""

ts = ts.replace(old, new)
with open('server.ts', 'w') as f:
    f.write(ts)
print("Fixed!")
