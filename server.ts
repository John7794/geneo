import crypto from "crypto";
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
import { initializeApp, getApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Ініціалізація конфігурації адміністратора
const adminEmailsList = (process.env.ADMIN_EMAIL || "www.johnsel771994@gmail.com,johnsel771994@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase());

let adminConfig: any = { projectId: "geneo-b8e63" };
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    let raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (raw.startsWith("'") && raw.endsWith("'")) raw = raw.slice(1, -1);
    const serviceAccount = JSON.parse(raw);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }
    adminConfig.credential = cert(serviceAccount);
    console.log("Using provided FIREBASE_SERVICE_ACCOUNT for credentials.");
  } catch (e: any) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT.", e.message);
  }
}
initializeApp(adminConfig);
const fdb = getFirestore(getApp(), "ai-studio-63d48ced-44ea-42e9-9cf6-e86ae5746ff1");

// Перевірка чи файлова система доступна лише для читання (Vercel Serverless)
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

// Ініціалізація та наповнення робочої директорії
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

// Відновлення синхронізованих даних із Firestore
async function restoreSyncedDataFromFirestore() {
  try {
    const snap = await fdb.collection("synced_sheets").get();
    if (snap.empty) {
      console.log("ℹ️ No remote synced data in Firestore, using bundled database.");
      return;
    }
    console.log(`📦 Restoring ${snap.size} files from Firestore into ${ACTIVE_DATA_DIR}...`);
    for (const doc of snap.docs) {
      const data = doc.data();
      if (!data.relativePath || !data.content) continue;
      const targetPath = path.join(ACTIVE_DATA_DIR, data.relativePath);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      let fileBuf: Buffer;
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
  if (!force && (now - lastFirestoreCheckTime < 5000 || isRestoring)) {
    return;
  }
  lastFirestoreCheckTime = now;

  try {
    const statusDoc = await fdb.collection("synced_meta").doc("status").get();
    if (!statusDoc.exists) return;
    const remoteTimestamp = statusDoc.data()?.lastSyncedTimestamp || 0;
    if (remoteTimestamp > localSyncTimestamp) {
      console.log(`🔄 Remote data in Firestore is newer (${remoteTimestamp} > ${localSyncTimestamp}). Updating local files...`);
      isRestoring = true;
      await restoreSyncedDataFromFirestore();
      isRestoring = false;
    }
  } catch (err) {
    console.warn("⚠️ ensureLatestDataFromFirestore error:", err);
  }
}

// Збереження даних у Firestore для serverless інстанцій
async function persistSyncedDataToFirestore() {
  try {
    console.log("📦 Persisting synced database files to Firestore...");
    const filesToSync: string[] = [];

    const ukDir = path.join(ACTIVE_DATA_DIR, "db", "uk");
    if (fs.existsSync(ukDir)) {
      const csvFiles = fs.readdirSync(ukDir).filter((f) => f.endsWith(".csv"));
      for (const f of csvFiles) {
        filesToSync.push(path.join("db", "uk", f));
      }
    }
    if (fs.existsSync(path.join(ACTIVE_DATA_DIR, "db", "metadata.json"))) {
      filesToSync.push(path.join("db", "metadata.json"));
    }
    if (fs.existsSync(path.join(ACTIVE_DATA_DIR, "kinship.json"))) {
      filesToSync.push("kinship.json");
    }

    const batch = fdb.batch();
    for (const relPath of filesToSync) {
      const fullPath = path.join(ACTIVE_DATA_DIR, relPath);
      if (!fs.existsSync(fullPath)) continue;
      const rawContent = fs.readFileSync(fullPath);
      const compressedContent = zlib.deflateSync(rawContent).toString("base64");

      const docId = relPath.replace(/[/\\]/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
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

    console.log(`✅ Saved ${filesToSync.length} database files and status to Firestore!`);
  } catch (err) {
    console.warn("⚠️ Failed to persist synced data to Firestore:", err);
  }
}

export const app = express();
app.use(compression());
const PORT = process.env.PORT || 3000;

// Допоміжна функція пошуку файлів у робочих каталогах
const resolveDataFile = (rel: string) => {
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

// Повнотекстовий контекст для Gemini AI (Gemini 2.5 Flash має вікно 1M токенів)
function getAiContext(profileId?: string): string {
  try {
    const basicPath = resolveDataFile("db/uk/basic.csv");
    const rolesPath = resolveDataFile("db/uk/familyRoles.csv");
    const namesPath = resolveDataFile("db/uk/names.csv");

    if (!fs.existsSync(basicPath)) return "";

    const basicContent = fs.readFileSync(basicPath, "utf8");
    const rolesContent = fs.existsSync(rolesPath) ? fs.readFileSync(rolesPath, "utf8") : "";
    const namesContent = fs.existsSync(namesPath) ? fs.readFileSync(namesPath, "utf8") : "";

    let focusContext = "";
    // Якщо користувач дивиться конкретний профіль, фокусуємо контекст на ньому та його родичах
    if (profileId) {
      const basicLines = basicContent.split("\n");
      const targetLine = basicLines.find((l) => l.startsWith(profileId + ","));
      const rolesLine = rolesContent.split("\n").find((l) => l.startsWith(profileId + ","));

      let relatedLines: string[] = [];
      if (rolesLine) {
        // Знаходимо ID батьків, подружжя, дітей
        const ids = rolesLine.split(",").join(";").split(/[;\s]+/).filter((x) => /^\d+$/.test(x));
        relatedLines = basicLines.filter((l) => {
          const id = l.split(",")[0];
          return ids.includes(id);
        });
      }

      focusContext = `
[ФОКУСНА ПЕРСОНА (ID=${profileId})]:
${targetLine || "Не знайдено"}

[РОДИННІ РОЛІ ТА ЗВ'ЯЗКИ ДЛЯ ЦІЄЇ ПЕРСОНИ]:
${rolesLine || "Не вказано"}

[БЛИЗЬКЕ РОДИННЕ КОЛО]:
${relatedLines.join("\n")}
`;
    }

    return `
${focusContext}
[ОСНОВНА БАЗА ДАНИХ (basic.csv)]:
${basicContent}

[РОДИННІ ЗВ'ЯЗКИ ТА РОЛІ (familyRoles.csv)]:
${rolesContent}

[АЛЬТЕРНАТИВНІ ТА ДІВОЧІ ПРІЗВИЩА (names.csv)]:
${namesContent}
`;
  } catch (e) {
    console.error("Error reading AI context:", e);
    return "";
  }
}

app.use(express.json());
app.use(cookieParser());

// Роздача /data зі статичним кешуванням
app.use("/data", async (req, res, next) => {
  if (req.path.includes("metadata.json") || req.path.includes("basic.csv")) {
    await ensureLatestDataFromFirestore();
  }
  const activeFile = path.join(ACTIVE_DATA_DIR, req.path);
  const distFile = path.join(process.cwd(), "dist", "data", req.path);
  const cwdFile = path.join(process.cwd(), "data", req.path);

  const fileToSend = [activeFile, distFile, cwdFile].find(
    (f) => fs.existsSync(f) && fs.statSync(f).isFile()
  );

  if (fileToSend) {
    // metadata.json не кешуємо, але великі файли та kinship.json кешуємо з валідацією
    if (req.path.includes("metadata.json")) {
      res.setHeader("Cache-Control", "no-cache, must-revalidate");
    } else {
      res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=86400");
    }
    return res.sendFile(fileToSend);
  }
  next();
});

// Ендпоінт індексу спорідненості
app.get("/api/data/kinship", async (req, res) => {
  await ensureLatestDataFromFirestore();
  const file = resolveDataFile("kinship.json");
  if (fs.existsSync(file)) {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=86400");
    return res.sendFile(file);
  }
  res.status(404).json({ error: "Kinship index not found" });
});

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.GEMINI_API_KEY || "geneo-secure-session-salt-2026";

function createSessionToken(identifier: string): string {
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(identifier).digest("hex");
  return `${identifier}.${sig}`;
}

function verifySessionToken(token: string): string | null {
  if (!token) return null;
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) {
    if (process.env.NODE_ENV !== "production") return token;
    return null;
  }
  const identifier = token.substring(0, lastDot);
  const sig = token.substring(lastDot + 1);
  const expectedSig = crypto.createHmac("sha256", SESSION_SECRET).update(identifier).digest("hex");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
    return identifier;
  }
  return null;
}

function getAuthenticatedUser(req: express.Request): string | null {
  if (req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer" && parts[1]) {
      const verified = verifySessionToken(parts[1]);
      if (verified) return verified.toLowerCase().trim();
      if (req.cookies && req.cookies.auth_email) {
        const cookieUser = req.cookies.auth_email.toLowerCase().trim().replace(/[\r\n\s]/g, "");
        if (parts[1].toLowerCase().trim() === cookieUser) {
          return cookieUser;
        }
      }
    }
  }

  if (req.cookies && req.cookies.auth_session) {
    const verified = verifySessionToken(req.cookies.auth_session);
    if (verified) return verified.toLowerCase().trim();
  }

  if (req.cookies && req.cookies.auth_email) {
    return req.cookies.auth_email.toLowerCase().trim().replace(/[\r\n\s]/g, "");
  }

  if (process.env.NODE_ENV !== "production") {
    return "dev-local-user";
  }

  return null;
}

function checkCanSync(req: express.Request): boolean {
  const user = getAuthenticatedUser(req);
  if (!user) return false;
  if (adminEmailsList.includes(user)) return true;
  return process.env.NODE_ENV !== "production";
}

async function checkCanShare(req: express.Request): Promise<boolean> {
  const user = getAuthenticatedUser(req);
  if (!user) return false;
  if (adminEmailsList.some(a => a.includes(user) || user.includes(a))) return true;

  try {
    const snap = await fdb.collection("shares").where("email", "==", user).get();
    if (!snap.empty) {
      const shareData = snap.docs[0].data();
      return !!shareData.canShare;
    }
  } catch (e) {
    console.error("checkCanShare error:", e);
  }
  return false;
}

// In-memory rate limiting для AI консультанта
const aiRateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkAiRateLimit(identifier: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 хвилина
  const maxRequests = 15; // максимум 15 запитів на хвилину

  const record = aiRateLimitMap.get(identifier);
  if (!record || now > record.resetTime) {
    aiRateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (record.count >= maxRequests) {
    return false;
  }
  record.count++;
  return true;
}

if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, val] of aiRateLimitMap.entries()) {
      if (now > val.resetTime) aiRateLimitMap.delete(key);
    }
  }, 5 * 60 * 1000);
  if (timer.unref) timer.unref();
}

app.get("/api/db-status", async (req, res) => {
  await ensureLatestDataFromFirestore();
  const metaPath = resolveDataFile("db/metadata.json");
  let meta = { lastUpdated: null, timestamp: 0, sheetsSynced: 0 };
  if (fs.existsSync(metaPath)) {
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    } catch (e) {}
  }

  let profileCount = 0;
  const basicPath = resolveDataFile("db/uk/basic.csv");
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
    serverTime: Date.now(),
  });
});

let isSyncInProgress = false;

app.get("/api/sync-data", (req, res) => {
  res.json({ inProgress: isSyncInProgress });
});

app.post("/api/sync-data", async (req, res) => {
  if (!checkCanSync(req)) {
    return res.status(403).json({ error: "У вас немає прав для оновлення бази даних." });
  }

  if (isSyncInProgress) {
    return res.status(409).json({ error: "Синхронізація вже триває. Будь ласка, зачекайте..." });
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

    if (!IS_READONLY) {
      const distDataPath = path.join(process.cwd(), "dist", "data");
      if (fs.existsSync(distDataPath)) {
        try {
          fs.cpSync(ACTIVE_DATA_DIR, distDataPath, { recursive: true });
        } catch (cpErr) {}
      }
    }

    try {
      await persistSyncedDataToFirestore();
    } catch (persistErr) {}

    isSyncInProgress = false;
    res.json({
      success: true,
      message: "Таблиці та родинні зв'язки успішно оновлено!",
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

app.get("/login", (req, res) => {
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
            const idToken = await result.user.getIdToken();
            
            const res = await fetch('/api/auth-login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ emailOrPhone: email, idToken })
            });
            
            if (res.ok) {
              const data = await res.json();
              if (data.token) localStorage.setItem('auth_token', data.token);
              window.location.href = '/?t=' + Date.now();
            } else {
              const data = await res.json().catch(() => ({}));
              document.getElementById('error').innerText = data.error || 'Доступ заборонено або вас немає в списку запрошених.';
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
            const data = await res.json().catch(() => ({}));
            document.getElementById('error').innerText = data.error || 'Доступ заборонено або вас немає в списку запрошених.';
          }
        };
      </script>
    </body>
    </html>
  `);
});

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || "AIzaSyASdK-k9JaA4FcjVkMuga6uigstkhxznVY";

async function verifyGoogleIdToken(idToken: string): Promise<string | null> {
  try {
    // 1. Офіційний Firebase Identity Toolkit REST API
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );

    if (res.ok) {
      const data: any = await res.json();
      if (data.users && data.users.length > 0 && data.users[0].email) {
        return data.users[0].email.toLowerCase().trim().replace(/[\r\n\s]/g, "");
      }
    }

    // 2. Резервна перевірка через Google OAuth2 tokeninfo
    const oauthRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    if (oauthRes.ok) {
      const oauthData: any = await oauthRes.json();
      if (oauthData.email) {
        return oauthData.email.toLowerCase().trim().replace(/[\r\n\s]/g, "");
      }
    }
  } catch (err) {
    console.error("Error verifying Google ID token:", err);
  }
  return null;
}

app.post("/api/auth-login", async (req, res) => {
  const emailOrPhone = req.body.emailOrPhone || "";
  const idToken = req.body.idToken || "";

  let verifiedEmail: string | null = null;

  if (idToken) {
    verifiedEmail = await verifyGoogleIdToken(idToken);
    if (!verifiedEmail) {
      return res.status(401).json({ error: "Недійсний токен авторизації Google." });
    }
  }

  const cleanAuth = (emailOrPhone && typeof emailOrPhone === "string")
    ? emailOrPhone.toLowerCase().trim().replace(/[\r\n\s]/g, "")
    : "";

  // Перевірка на адміністратора (якщо cleanAuth або verifiedEmail є в списку адмінів)
  const isInputAdmin = cleanAuth && adminEmailsList.some(a => a.includes(cleanAuth) || cleanAuth.includes(a));
  const isVerifiedAdmin = verifiedEmail && adminEmailsList.some(a => a.includes(verifiedEmail) || verifiedEmail.includes(a));

  if (isInputAdmin || isVerifiedAdmin) {
    if (!verifiedEmail) {
      return res.status(403).json({ 
        error: "Для входу в обліковий запис адміністратора обов'язкова авторизація через кнопку 'Увійти через Google'." 
      });
    }

    const adminEmail = verifiedEmail;
    const sessionToken = createSessionToken(adminEmail);
    res.cookie("auth_session", sessionToken, {
      httpOnly: true,
      path: "/",
      sameSite: "none",
      secure: true,
      partitioned: true,
    });
    res.cookie("auth_email", adminEmail, {
      httpOnly: true,
      path: "/",
      sameSite: "none",
      secure: true,
      partitioned: true,
    });
    res.cookie("auth_email_client", adminEmail, {
      httpOnly: false,
      path: "/",
      sameSite: "none",
      secure: true,
      partitioned: true,
    });
    return res.json({ success: true, token: sessionToken });
  }

  // Якщо це звичайний користувач (гість):
  const targetEmailOrPhone = verifiedEmail || cleanAuth;
  if (!targetEmailOrPhone) {
    return res.status(401).json({ error: "Вкажіть email або номер телефону." });
  }

  try {
    const snap = await fdb.collection("shares").where("email", "==", targetEmailOrPhone).get();
    if (snap.empty && process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Доступ заборонено. Вас немає у списку запрошених гостей." });
    }

    const sessionToken = createSessionToken(targetEmailOrPhone);
    res.cookie("auth_session", sessionToken, {
      httpOnly: true,
      path: "/",
      sameSite: "none",
      secure: true,
      partitioned: true,
    });
    res.cookie("auth_email", targetEmailOrPhone, {
      httpOnly: true,
      path: "/",
      sameSite: "none",
      secure: true,
      partitioned: true,
    });
    res.cookie("auth_email_client", targetEmailOrPhone, {
      httpOnly: false,
      path: "/",
      sameSite: "none",
      secure: true,
      partitioned: true,
    });
    return res.json({ success: true, token: sessionToken });
  } catch (err: any) {
    console.error("Помилка перевірки доступу у Firestore:", err);
    return res.status(500).json({ error: "Помилка перевірки доступу" });
  }
});

app.post("/api/invite", async (req, res) => {
  if (!(await checkCanShare(req))) {
    return res.status(403).json({ error: "Немає прав для запрошення користувачів." });
  }

  const emailOrPhone = req.body.email || req.body.phone;
  if (!emailOrPhone) return res.status(400).json({ error: "Missing email or phone" });

  const val = emailOrPhone.toLowerCase().trim().replace(/\s/g, "");
  try {
    await fdb.collection("shares").add({
      email: val,
      canShare: !!req.body.canShare,
      canSync: !!req.body.canSync,
      hiddenProfiles: Array.isArray(req.body.hiddenProfiles) ? req.body.hiddenProfiles : [],
      createdAt: FieldValue.serverTimestamp(),
    });
    res.json({ success: true });
  } catch (e: any) {
    console.error("Invite error:", e);
    res.status(500).json({ error: "Failed" });
  }
});

app.delete("/api/shares/:id", async (req, res) => {
  if (!(await checkCanShare(req))) {
    return res.status(403).json({ error: "Немає прав для видалення доступів." });
  }

  try {
    await fdb.collection("shares").doc(req.params.id).delete();
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: "Failed" });
  }
});

app.get("/api/shares", async (req, res) => {
  if (!(await checkCanShare(req))) {
    return res.status(403).json({ error: "Немає прав для перегляду списку доступів." });
  }

  try {
    const snap = await fdb.collection("shares").get();
    const shares = snap.docs.map((doc) => ({ id: doc.id, email: doc.data().email || doc.data().value, ...doc.data() }));
    res.json(shares);
  } catch (e) {
    res.json([]);
  }
});

app.get("/api/config", async (req, res) => {
  const user = getAuthenticatedUser(req);
  if (user) {
    if (adminEmailsList.some(a => a.includes(user) || user.includes(a))) {
      res.json({ canShare: true, canSync: true, isMainAdmin: true });
      return;
    }

    try {
      const snap = await fdb.collection("shares").where("email", "==", user).get();
      if (!snap.empty) {
        const shareData = snap.docs[0].data();
        res.json({ 
          canShare: !!shareData.canShare, 
          canSync: !!shareData.canSync, 
          isMainAdmin: false,
          hiddenProfiles: shareData.hiddenProfiles || []
        });
        return;
      }
    } catch (e) {
      console.error("Firebase shares query error:", e);
    }
  } else if (process.env.NODE_ENV !== "production") {
    res.json({ canShare: true, canSync: true, isMainAdmin: true });
    return;
  }
  res.status(401).json({ error: "Unauthorized" });
});

if (process.env.NODE_ENV !== "production") {
  const rootScriptsPath = path.join(process.cwd(), "scripts");
  app.use("/scripts", express.static(rootScriptsPath, { setHeaders: (res) => res.setHeader("Cache-Control", "no-store") }));
  const rootCssPath = path.join(process.cwd(), "css");
  app.use("/css", express.static(rootCssPath, { setHeaders: (res) => res.setHeader("Cache-Control", "no-store") }));
  const rootAssetsPath = path.join(process.cwd(), "assets");
  app.use("/assets", express.static(rootAssetsPath));
}

// AI Консультант з оптимізованим контекстом, автентифікацією та лімітами
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Потрібна авторизація для використання AI консультанта." });
    }

    if (!checkAiRateLimit(user)) {
      return res.status(429).json({ error: "Забагато запитів до AI. Будь ласка, зачекайте хвилину перед наступним запитом." });
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured. Please add your Gemini API Key in the Settings -> Secrets menu.");
    }

    const prompt = req.body.prompt;
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Текст запиту не може бути порожнім." });
    }
    if (prompt.length > 2500) {
      return res.status(400).json({ error: "Запит занадто довгий (максимум 2500 символів)." });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });

    const rawHistory = Array.isArray(req.body.history) ? req.body.history.slice(-10) : [];
    const currentProfileId = req.body.currentProfileId && typeof req.body.currentProfileId === "string" ? req.body.currentProfileId : undefined;

    let contents = [];
    for (const msg of rawHistory) {
      if (msg && typeof msg.text === "string") {
        contents.push({ role: msg.role === "user" ? "user" : "model", parts: [{ text: msg.text.slice(0, 3000) }] });
      }
    }
    contents.push({ role: "user", parts: [{ text: prompt.trim() }] });

    const focusedContext = getAiContext(currentProfileId);

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
      contents: contents,
      config: {
        systemInstruction:
          "You are a helpful AI assistant specialized in genealogy research. Help the user discover their family history, explain historical contexts, analyze surnames, and suggest where to find archival records. Answer concisely, informatively, and politely in Ukrainian." +
          (currentProfileId
            ? `\n\nКористувач зараз переглядає профіль персони з ID=${currentProfileId}. Враховуй це, якщо питання стосується 'цієї людини' або її родинних зв'язків.`
            : "") +
          (focusedContext ? `\n\nОсь релевантні архівні дані:\n${focusedContext}` : ""),
      },
    });

    res.json({
      text: response.text,
      usage: response.usageMetadata
        ? {
            totalTokenCount: response.usageMetadata.totalTokenCount,
          }
        : null,
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "Error generating response" });
  }
});

// Продакшен роздача клієнтської статики з оптимізованим кешуванням
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
  app.use(
    express.static(distPath, {
      setHeaders: (res, filePath) => {
        // Хешовані JS/CSS бандли та іконки кешуємо на 1 рік в браузері та CDN
        if (filePath.includes("/assets/") || filePath.endsWith(".svg") || filePath.endsWith(".png")) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else {
          res.setHeader("Cache-Control", "no-cache, must-revalidate");
        }
      },
    })
  );

  app.get("*", (req, res) => {
    const p = req.path;
    if (p.startsWith("/api") || p.startsWith("/login")) {
      return res.status(404).end();
    }
    res.setHeader("Cache-Control", "no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
