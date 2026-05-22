import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

let adminConfig = { projectId: "geneo-b8e63" };
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    adminConfig.credential = admin.credential.cert(serviceAccount);
    console.log("Using provided FIREBASE_SERVICE_ACCOUNT for credentials.");
  } catch (e) {
    console.error("Failed to parse", e);
  }
}

admin.initializeApp(adminConfig);
const fdb = getFirestore(admin.app(), 'ai-studio-63d48ced-44ea-42e9-9cf6-e86ae5746ff1');

async function test() {
  try {
    console.log("Testing write to shares");
    await fdb.collection('shares').add({ test: 123 });
    console.log("Success");
  } catch (e) {
    console.error("Error!!!", e);
  }
}
test();
