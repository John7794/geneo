import { main as syncDataMain } from "./scripts/api-tasks/sync-data.js";
import { main as generateKinshipMain } from "./scripts/api-tasks/generate-kinship.js";
import admin from 'firebase-admin';
import zlib from "zlib";
import fs from "fs";
import path from "path";
import { getFirestore } from 'firebase-admin/firestore';
import "dotenv/config";

async function saveFileToFirestore(filePath, content, fdb) {
  try {
    const cleanPath = filePath.replace(/\\/g, '/');
    const compressed = zlib.gzipSync(Buffer.from(content, 'utf8'));
    const base64 = compressed.toString('base64');
    
    await fdb.collection('db_files').doc(cleanPath).set({
      content: base64,
      compressed: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`[Firestore DB] Saved compressed ${cleanPath} to Firestore`);
  } catch (e) {
    console.error(`[Firestore DB] Failed to save ${filePath} to Firestore:`, e);
  }
}

async function run() {
  console.log("Starting direct sync...");
  let adminConfig: any = { projectId: "geneo-b8e63" };
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      let raw = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (raw.startsWith("'") && raw.endsWith("'")) raw = raw.slice(1, -1);
      const serviceAccount = JSON.parse(raw);
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      adminConfig.credential = admin.credential.cert(serviceAccount);
    } catch (e: any) {}
  }
  if (!admin.apps.length) admin.initializeApp(adminConfig);
  const fdb = getFirestore(admin.app(), 'ai-studio-63d48ced-44ea-42e9-9cf6-e86ae5746ff1');

  await syncDataMain();
  await generateKinshipMain();

  const filesToSave = [];
  const tmpDataPath = process.env.DATA_DIR || process.cwd() + '/data'; // fall back to local data dir if no /tmp/data
  
  if (fs.existsSync(path.join(tmpDataPath, 'kinshipIndex.json'))) {
    filesToSave.push('kinshipIndex.json');
  }
  if (fs.existsSync(path.join(tmpDataPath, 'db/metadata.json'))) {
    filesToSave.push('db/metadata.json');
  }
  if (fs.existsSync(path.join(tmpDataPath, 'db/uk'))) {
    const csvFiles = fs.readdirSync(path.join(tmpDataPath, 'db/uk'));
    csvFiles.forEach(f => {
      filesToSave.push(`db/uk/${f}`);
    });
  }

  console.log(`[Firestore DB] Uploading ${filesToSave.length} files to Firestore...`);
  for (const file of filesToSave) {
    const localPath = path.join(tmpDataPath, file);
    if (fs.existsSync(localPath)) {
      const content = fs.readFileSync(localPath, 'utf8');
      await saveFileToFirestore(file, content, fdb);
    }
  }
  console.log("Done direct sync!");
  process.exit(0);
}

run().catch(console.error);
