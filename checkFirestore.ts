import 'dotenv/config';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

let adminConfig: any = { projectId: "geneo-b8e63" };
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw.startsWith("'") && raw.endsWith("'")) raw = raw.slice(1, -1);
  adminConfig.credential = admin.credential.cert(JSON.parse(raw));
}
admin.initializeApp(adminConfig);
const fdb = getFirestore(admin.app(), 'ai-studio-63d48ced-44ea-42e9-9cf6-e86ae5746ff1');

async function check() {
  const doc = await fdb.collection('db_files').doc('server.ts').get();
  if (doc.exists) {
     console.log("EXISTS");
  } else {
     console.log("NOT EXISTS");
  }
}
check();
