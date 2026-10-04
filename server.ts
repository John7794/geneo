import zlib from "zlib";
import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);
import { GoogleGenAI } from "@google/genai";
import express from "express";
import compression from "compression";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import { initializeApp, getApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

let adminConfig: any = { projectId: "geneo-b8e63" };
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    let raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (raw.startsWith("'") && raw.endsWith("'")) raw = raw.slice(1, -1);
    const serviceAccount = JSON.parse(raw);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    adminConfig.credential = cert(serviceAccount);
    console.log("Using provided FIREBASE_SERVICE_ACCOUNT for credentials.");
  } catch (e: any) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT.", e.message);
  }
}
initializeApp(adminConfig);
const fdb = getFirestore(getApp(), 'ai-studio-63d48ced-44ea-42e9-9cf6-e86ae5746ff1');

// Check if root filesystem is read-only (Cloud Run / Serverless container)
const IS_READONLY = (() => {
  try {
    const testFile = path.join(process.cwd(), ".write-test-" + Date.now());
    fs.writeFileSync(testFile, "1");
    fs.unlinkSync(testFile);
    return false;
  } catch {
    return true;
  }
})();

const ACTIVE_DATA_DIR = IS_READONLY
  ? path.join("/tmp", "genealogy_app_data", "data")
  : path.join(process.cwd(), "data");

process.env.ACTIVE_DATA_DIR = ACTIVE_DATA_DIR;

// Seed ACTIVE_DATA_DIR on startup if running in read-only environment
function initActiveDataDir() {
  if (IS_READONLY) {
    if (!fs.existsSync(ACTIVE_DATA_DIR)) {
      fs.mkdirSync(ACTIVE_DATA_DIR, { recursive: true });
    }
    const seedCandidates = [
      path.join(process.cwd(), "data"),
      path.join(process.cwd(), "dist", "data"),
    ];
    for (const src of seedCandidates) {
      if (fs.existsSync(src)) {
        try {
          fs.cpSync(src, ACTIVE_DATA_DIR, { recursive: true });
          console.log(`📁 Seeded writable data directory ${ACTIVE_DATA_DIR} from ${src}`);
          break;
        } catch (e) {
          console.warn(`Could not seed from ${src}:`, e);
        }
      }
    }
  }
}
initActiveDataDir();

let localSyncTimestamp = 0;
let lastFirestoreCheckTime = 0;
let isRestoring = false;

// Restore any previously synced data from Firestore if available
async function restoreSyncedDataFromFirestore() {
  try {
    const snap = await fdb.collection("synced_sheets").get();
    if (snap.empty) {
      console.log("ℹ️ No remote synced data in Firestore, using bundled database.");
      return;
    }
    console.log(`📥 Restoring ${snap.size} files from Firestore into ${ACTIVE_DATA_DIR}...`);
    for (const doc of snap.docs) {
      const data = doc.data();
      if (!data.relativePath || !data.content) continue;
      const targetPath = path.join(ACTIVE_DATA_DIR, data.relativePath);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      let fileBuf;
      if (data.isCompressed) {
        fileBuf = zlib.inflateSync(Buffer.from(data.content, "base64"));
      } else {
        fileBuf = Buffer.from(data.content, "utf8");
      }
      fs.writeFileSync(targetPath, fileBuf);
    }

    try {
      const statusDoc = await fdb.collection("synced_meta").doc("status").get();
      if (statusDoc.exists) {
        localSyncTimestamp = statusDoc.data()?.lastSyncedTimestamp || Date.now();
      } else {
        const metaPath = path.join(ACTIVE_DATA_DIR, "db", "metadata.json");
        if (fs.existsSync(metaPath)) {
          const m = JSON.parse(fs.readFileSync(metaPath, "utf8"));
          localSyncTimestamp = m.timestamp || Date.now();
        }
      }
    } catch (e) {}

    console.log(`✅ Successfully restored latest database state from Firestore! Version: ${localSyncTimestamp}`);
  } catch (err) {
    console.warn("⚠️ Could not restore from Firestore:", err);
  }
}
restoreSyncedDataFromFirestore();

async function ensureLatestDataFromFirestore(force = false) {
  const now = Date.now();
  if (!force && (now - lastFirestoreCheckTime < 3500 || isRestoring)) {
    return;
  }
  lastFirestoreCheckTime = now;

  try {
    const statusDoc = await fdb.collection("synced_meta").doc("status").get();
    if (!statusDoc.exists) return;
    const remoteTimestamp = statusDoc.data()?.lastSyncedTimestamp || 0;
    if (remoteTimestamp > localSyncTimestamp) {
      console.log(`🔄 Remote data in Firestore is newer (${remoteTimestamp} > ${localSyncTimestamp}). Updating local instance files...`);
      isRestoring = true;
      await restoreSyncedDataFromFirestore();
      cachedDbContext = "";
      isRestoring = false;
    }
  } catch (err) {
    console.warn("⚠️ ensureLatestDataFromFirestore error:", err);
  }
}

// Backup newly synced data to Firestore so other/future container instances have it
async function persistSyncedDataToFirestore() {
  try {
    console.log("📤 Persisting synced database files to Firestore...");
    const filesToSync = [];
    
    // Add all CSV files
    const ukDir = path.join(ACTIVE_DATA_DIR, "db", "uk");
    if (fs.existsSync(ukDir)) {
      const csvFiles = fs.readdirSync(ukDir).filter(f => f.endsWith(".csv"));
      for (const f of csvFiles) {
        filesToSync.push(path.join("db", "uk", f));
      }
    }
    // Add metadata.json
    if (fs.existsSync(path.join(ACTIVE_DATA_DIR, "db", "metadata.json"))) {
      filesToSync.push(path.join("db", "metadata.json"));
    }
    // Add kinship.json
    if (fs.existsSync(path.join(ACTIVE_DATA_DIR, "kinship.json"))) {
      filesToSync.push("kinship.json");
    }

    const batch = fdb.batch();
    for (const relPath of filesToSync) {
      const fullPath = path.join(ACTIVE_DATA_DIR, relPath);
      if (!fs.existsSync(fullPath)) continue;
      const rawContent = fs.readFileSync(fullPath);
      const compressedContent = zlib.deflateSync(rawContent).toString("base64");
      
      const docId = relPath.replace(/[\/\\]/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
      const ref = fdb.collection("synced_sheets").doc(docId);
      batch.set(ref, {
        relativePath: relPath,
        content: compressedContent,
        isCompressed: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();

    let newTimestamp = Date.now();
    const metaPath = path.join(ACTIVE_DATA_DIR, "db", "metadata.json");
    if (fs.existsSync(metaPath)) {
      try {
        const m = JSON.parse(fs.readFileSync(metaPath, "utf8"));
        if (m.timestamp) newTimestamp = m.timestamp;
      } catch (e) {}
    }

    await fdb.collection("synced_meta").doc("status").set({
      lastSyncedTimestamp: newTimestamp,
      version: newTimestamp,
      updatedAt: FieldValue.serverTimestamp(),
    });
    localSyncTimestamp = newTimestamp;

    console.log(`✅ Saved ${filesToSync.length} database files and status to Firestore for persistent cloud storage!`);
  } catch (err) {
    console.warn("⚠️ Failed to persist synced data to Firestore:", err);
  }
}


export const app = express();
app.use(compression());
const PORT = 3000;

let cachedDbContext = "";
function getDbContext() {
  if (cachedDbContext) return cachedDbContext;
  try {
    const resolvePath = (rel) => {
      const candidates = [
        path.join(ACTIVE_DATA_DIR, rel),
        path.join(process.cwd(), "dist", "data", rel),
        path.join(process.cwd(), "data", rel),
      ];
      for (const c of candidates) {
        if (fs.existsSync(c)) return c;
      }
      return path.join(ACTIVE_DATA_DIR, rel);
    };

    const basic = fs.readFileSync(resolvePath("db/uk/basic.csv"), "utf8");
    const roles = fs.readFileSync(resolvePath("db/uk/familyRoles.csv"), "utf8");
    const birth = fs.readFileSync(resolvePath("db/uk/birth.csv"), "utf8");
    const death = fs.readFileSync(resolvePath("db/uk/death.csv"), "utf8");
        cachedDbContext = `Ось дані бази родоводу (у форматі CSV). Використовуй їх для відповідей на питання.
Не вигадуй дані, спирайся тільки на цю інформацію.

[basic.csv - основні дані (id, прізвище, ім'я, по батькові)]
${basic}

[familyRoles.csv - родинні зв'язки (id, біологічні батьки, подружжя)]
${roles}

[birth.csv - дані про народження]
${birth}

[death.csv - дані про смерть]
${death}`;
    return cachedDbContext;
  } catch(e) {
    console.error("Error reading db files:", e);
    return "";
  }
}

app.use(express.json());
app.use(cookieParser());

// First priority: files in ACTIVE_DATA_DIR
app.use("/data", async (req, res, next) => {
  if (req.path.includes("metadata.json") || req.path.includes("basic.csv")) {
    await ensureLatestDataFromFirestore();
  }
  const activeFile = path.join(ACTIVE_DATA_DIR, req.path);
  if (fs.existsSync(activeFile) && fs.statSync(activeFile).isFile()) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res.sendFile(activeFile);
  }
  const distFile = path.join(process.cwd(), "dist", "data", req.path);
  if (fs.existsSync(distFile) && fs.statSync(distFile).isFile()) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res.sendFile(distFile);
  }
  const cwdFile = path.join(process.cwd(), "data", req.path);
  if (fs.existsSync(cwdFile) && fs.statSync(cwdFile).isFile()) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res.sendFile(cwdFile);
  }
  next();
});

app.get("/api/data/kinship", async (req, res) => {
  await ensureLatestDataFromFirestore();
  const candidates = [
    path.join(ACTIVE_DATA_DIR, "kinship.json"),
    path.join(process.cwd(), "dist", "data", "kinship.json"),
    path.join(process.cwd(), "data", "kinship.json"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      return res.sendFile(c, (err) => {
        if (err && !res.headersSent) {
          res.status(500).json({ error: "Failed to send kinship index" });
        }
      });
    }
  }
  res.status(404).json({ error: "Kinship index not found" });
});

let isSyncInProgress = false;

function checkCanSync(req: express.Request): boolean {
  let emailOrPhone = req.cookies && req.cookies.auth_email;
  if (!emailOrPhone && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') emailOrPhone = parts[1];
  }
  if (!emailOrPhone) {
    if (process.env.NODE_ENV !== "production") return true;
    return false;
  }
  const val = emailOrPhone.toLowerCase().trim().replace(/\s/g, '');
  return val === 'www.johnsel771994@gmail.com' || val === 'johnsel771994@gmail.com';
}

app.get("/api/db-status", async (req, res) => {
  await ensureLatestDataFromFirestore();
  const metaPath = path.join(ACTIVE_DATA_DIR, "db", "metadata.json");
  let meta = { lastUpdated: null, timestamp: 0, sheetsSynced: 0 };
  if (fs.existsSync(metaPath)) {
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    } catch (e) {}
  }
  
  let profileCount = 0;
  const basicPath = path.join(ACTIVE_DATA_DIR, "db", "uk", "basic.csv");
  if (fs.existsSync(basicPath)) {
    try {
      const lines = fs.readFileSync(basicPath, "utf8").split("\n").filter(Boolean);
      profileCount = Math.max(0, lines.length - 1);
    } catch (e) {}
  }

  res.json({
    lastUpdated: meta.lastUpdated,
    timestamp: meta.timestamp || localSyncTimestamp,
    sheetsSynced: meta.sheetsSynced || 29,
    profileCount,
    serverTime: Date.now()
  });
});

app.get('/api/sync-data', (req, res) => {
  res.json({ inProgress: isSyncInProgress });
});

app.post('/api/sync-data', async (req, res) => {
  if (!checkCanSync(req)) {
    return res.status(403).json({ error: "У вас немає прав для оновлення бази даних." });
  }

  if (isSyncInProgress) {
    return res.status(409).json({ error: "Синхронізація вже триває. Будь ласка, зачекайте завершення..." });
  }

  isSyncInProgress = true;
  console.log("🔄 [API] User triggered database synchronization from Google Sheets...");

  try {
    const { stdout, stderr } = await execAsync(
      "node scripts/api-tasks/sync-data.js && node scripts/api-tasks/generate-kinship.js",
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          ACTIVE_DATA_DIR: ACTIVE_DATA_DIR,
        },
        timeout: 180000,
        maxBuffer: 10 * 1024 * 1024,
      }
    );

    console.log("✅ [API] Sync and kinship generation completed successfully.");
    if (stdout) console.log(stdout);
    if (stderr) console.warn(stderr);

    cachedDbContext = "";

    if (!IS_READONLY) {
      const distDataPath = path.join(process.cwd(), "dist", "data");
      if (fs.existsSync(distDataPath)) {
        try {
          fs.cpSync(ACTIVE_DATA_DIR, distDataPath, { recursive: true });
        } catch (cpErr) {
          console.warn("⚠️ [API] Failed to copy to dist/data:", cpErr);
        }
      }
    }
    // Persist all synced sheets to Firestore so any Cloud instance has the new data
    try {
      await persistSyncedDataToFirestore();
    } catch (persistErr) {
      console.warn("⚠️ [API] Firestore persistence warning:", persistErr);
    }

    isSyncInProgress = false;
    res.json({
      success: true,
      message: "Таблиці та родинні зв\x27язки успішно оновлено!",
      timestamp: Date.now(),
    });
  } catch (error: any) {
    isSyncInProgress = false;
    console.error("❌ [API] Error during sync-data:", error);
    res.status(500).json({
      error: "Помилка під час синхронізації з Google Sheets",
      details: error.message || String(error),
    });
  }
});

app.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Вхід - Закритий доступ</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0f2f5; font-family: sans-serif; margin: 0; }
        .login-box { background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); width: 100%; max-width: 400px; text-align: center; }
        h1 { margin-top: 0; color: #333; }
        p { color: #666; margin-bottom: 20px; }
        input, button { width: 100%; padding: 12px; margin-top: 10px; box-sizing: border-box; border-radius: 6px; border: 1px solid #ccc; font-size: 16px; }
        button { background: #007BFF; color: white; border: none; cursor: pointer; font-weight: bold; }
        button:hover { background: #0056b3; }
      </style>
    </head>
    <body>
      <div class="login-box">
        <h1>Вхід в Архів</h1>
        <p>Цей сайт працює в приватному режимі.<br>Доступ надається лише авторизованим користувачам.</p>
        <form id="loginForm">
          <input type="text" id="emailOrPhone" placeholder="Email або номер телефону" required />
          <button type="submit">Отримати доступ</button>
        </form>
        
        <hr style="margin: 20px 0; border: 0; border-top: 1px solid #ddd;" />
        <button id="googleLoginBtn" type="button" style="background: white; color: #757575; border: 1px solid #ddd; box-shadow: 0 1px 2px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; padding: 10px; font-weight: 500;">
          <svg style="width:20px;height:20px;margin-right:10px;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Увійти через Google
        </button>

        

        <div id="error" style="color: red; margin-top: 15px; font-weight: bold;"></div>
      </div>
      <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
        import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
        
        const firebaseConfig = {
          projectId: "geneo-b8e63",
          appId: "1:241221120342:web:9575c2edf16c29ac81a6f7",
          apiKey: "AIzaSyASdK-k9JaA4FcjVkMuga6uigstkhxznVY",
          authDomain: "geneo-b8e63.firebaseapp.com"
        };
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const provider = new GoogleAuthProvider();

        document.getElementById('googleLoginBtn').onclick = async () => {
          try {
            const result = await signInWithPopup(auth, provider);
            const email = result.user.email;
            
            const res = await fetch('/api/auth-login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ emailOrPhone: email })
            });
            
            if (res.ok) {
              const data = await res.json();
              if (data.token) localStorage.setItem('auth_token', data.token);
              window.location.href = '/?t=' + Date.now();
            } else {
              document.getElementById('error').innerText = 'Доступ заборонено або вас немає в списку запрошених.';
              auth.signOut();
            }
          } catch (error) {
            console.error(error);
            if (error.code !== "auth/popup-closed-by-user" && error.code !== "auth/cancelled-popup-request") {
              document.getElementById('error').innerText = 'Помилка авторизації через Google.';
            }
          }
        };



        document.getElementById('loginForm').onsubmit = async (e) => {
          e.preventDefault();
          const val = document.getElementById('emailOrPhone').value;
          const res = await fetch('/api/auth-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailOrPhone: val })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.token) localStorage.setItem('auth_token', data.token);
            window.location.href = '/?t=' + Date.now();
          } else {
            document.getElementById('error').innerText = 'Доступ заборонено або вас немає в списку запрошених.';
          }
        };
      </script>
    </body>
    </html>
  `);
});

app.post('/api/auth-login', (req, res) => {
  const emailOrPhone = req.body.emailOrPhone || '';
  if (emailOrPhone) {
    res.cookie('auth_email', emailOrPhone.toLowerCase().trim(), { httpOnly: true, path: '/', sameSite: 'none', secure: true, partitioned: true });
    res.cookie('auth_email_client', emailOrPhone.toLowerCase().trim(), { httpOnly: false, path: '/', sameSite: 'none', secure: true, partitioned: true });
    res.json({ success: true, token: emailOrPhone.toLowerCase().trim() });
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

app.post('/api/invite', async (req, res) => {
  const emailOrPhone = req.body.email || req.body.phone;
  if (!emailOrPhone) return res.status(400).json({ error: 'Missing email or phone' });
  
  const val = emailOrPhone.toLowerCase().trim().replace(/\s/g, '');
  try {
    await fdb.collection('shares').add({
      email: val,
      createdAt: FieldValue.serverTimestamp()
    });
    res.json({ success: true });
  } catch (e: any) {
    console.error("Invite error:", e);
    res.status(500).json({ error: 'Failed' });
  }
});


app.delete('/api/shares/:id', async (req, res) => {
  try {
    await fdb.collection('shares').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/shares', async (req, res) => {
  try {
    const snap = await fdb.collection('shares').get();
    const shares = snap.docs.map(doc => ({ id: doc.id, email: doc.data().value, ...doc.data() }));
    res.json(shares);
  } catch(e) {
    res.json([]);
  }
});

app.get('/api/config', async (req, res) => {
  let emailOrPhone = req.cookies && req.cookies.auth_email;
  if (!emailOrPhone && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') emailOrPhone = parts[1];
  }
  if (emailOrPhone) {
    const val = emailOrPhone.toLowerCase().trim().replace(/\s/g, '');
    
    if (val === 'www.johnsel771994@gmail.com' || val === 'johnsel771994@gmail.com') {
      res.json({ canShare: true, canSync: true, isMainAdmin: true });
      return;
    }
    
    try {
      const snap = await fdb.collection('shares').where('email', '==', val).get();
      console.log('Query result for', val, 'empty:', snap.empty);
      if (!snap.empty) {
        res.json({ canShare: false, canSync: false, isMainAdmin: false });
        return;
      }
    } catch(e) { console.error('Firebase shares query error:', e); }
  } else if (process.env.NODE_ENV !== "production") {
    res.json({ canShare: true, canSync: true, isMainAdmin: true });
    return;
  }
  res.status(401).json({ error: 'Unauthorized' });
});

if (process.env.NODE_ENV !== "production") {
  const rootScriptsPath = path.join(process.cwd(), 'scripts');
  app.use('/scripts', express.static(rootScriptsPath, {
      setHeaders: (res) => { res.setHeader('Cache-Control', 'no-store'); }
    }));
  const rootCssPath = path.join(process.cwd(), 'css');
  app.use('/css', express.static(rootCssPath, {
      setHeaders: (res) => { res.setHeader('Cache-Control', 'no-store'); }
    }));
  const rootAssetsPath = path.join(process.cwd(), 'assets');
  app.use('/assets', express.static(rootAssetsPath));
}

app.get('/sw.js', (req, res) => res.sendFile(path.join(process.cwd(), 'sw.js')));


app.post('/api/gemini/chat', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured. Please add your Gemini API Key in the Settings -> Secrets menu.");
    }
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
    const prompt = req.body.prompt;
    const history = req.body.history || [];
    const currentProfileId = req.body.currentProfileId;
    
    // Instead of using chat sessions which might require specific message history format,
    // we'll format the history into the prompt or contents for a simple implementation
    
    let contents = [];
    for (const msg of history) {
       contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] });
    }
    contents.push({ role: 'user', parts: [{ text: prompt }] });
    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: "You are a helpful AI assistant specialized in genealogy research. Help the user discover their family history, explain historical contexts, analyze surnames, and suggest where to find archival records. Answer concisely and politely in Ukrainian." +
          (currentProfileId ? "\n\nКористувач зараз переглядає профіль персони з ID=" + currentProfileId + ". Враховуй це, якщо питання стосується 'цієї людини' або поточного контексту." : "") +
          "\n\nОсь база даних проекту: " + getDbContext(),
      }
    });
    
    res.json({ 
      text: response.text, 
      usage: response.usageMetadata ? {
        totalTokenCount: response.usageMetadata.totalTokenCount
      } : null
    });
  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || 'Error generating response' });
  }
});

if (process.env.NODE_ENV !== "production") {
  (async () => {
    const viteName = "vi" + "te";
    const { createServer: createViteServer } = await import(/* @vite-ignore */ viteName);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  })();
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath, {
    setHeaders: (res, path) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    }
  }));
  app.get("*", (req, res) => {
    const p = req.path;
    if (p.startsWith("/api") || p.startsWith("/login")) {
       return res.status(404).end();
    }
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(3000, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
